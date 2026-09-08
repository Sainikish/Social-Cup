package com.socialcup.subscription.service;

import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.config.StripeProperties;
import com.socialcup.credit.service.CreditService;
import com.socialcup.subscription.dto.CreateSubscriptionRequest;
import com.socialcup.subscription.dto.SubscriptionResponse;
import com.socialcup.subscription.entity.ProcessedWebhookEvent;
import com.socialcup.subscription.entity.Subscription;
import com.socialcup.subscription.entity.SubscriptionStatus;
import com.socialcup.subscription.repository.ProcessedWebhookEventRepository;
import com.socialcup.subscription.repository.SubscriptionRepository;
import com.socialcup.user.entity.Member;
import com.socialcup.user.entity.MemberStatus;
import com.socialcup.user.repository.MemberRepository;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Invoice;
import com.stripe.model.StripeObject;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.SubscriptionCreateParams;
import com.stripe.param.SubscriptionUpdateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

// Member-facing subscribe/cancel/read, PLUS Stripe webhook processing
// (processWebhookEvent) - kept in one service rather than split out, since
// both sides own the same subscription lifecycle and this mirrors every
// other module in this codebase (one service per feature area). Never
// accepts a price, amount, or member id from the client: the $24.99/mo
// price is StripeProperties.priceId, and identity comes from
// CurrentUserResolver via the controller. Credits are granted ONLY from
// processWebhookEvent, never from subscribe() - creating a Stripe
// Subscription is not proof payment succeeded (see class Javadoc on
// resetAndGrantMonthlyCredits).
@Service
@Transactional
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);

    private static final String EVENT_INVOICE_PAYMENT_SUCCEEDED = "invoice.payment_succeeded";
    private static final String EVENT_INVOICE_PAYMENT_FAILED = "invoice.payment_failed";
    private static final String EVENT_SUBSCRIPTION_UPDATED = "customer.subscription.updated";
    private static final String EVENT_SUBSCRIPTION_DELETED = "customer.subscription.deleted";

    private final SubscriptionRepository subscriptionRepository;
    private final ProcessedWebhookEventRepository processedWebhookEventRepository;
    private final MemberRepository memberRepository;
    private final CreditService creditService;
    private final StripeProperties stripeProperties;

    public SubscriptionService(SubscriptionRepository subscriptionRepository,
                                ProcessedWebhookEventRepository processedWebhookEventRepository,
                                MemberRepository memberRepository,
                                CreditService creditService,
                                StripeProperties stripeProperties) {
        this.subscriptionRepository = subscriptionRepository;
        this.processedWebhookEventRepository = processedWebhookEventRepository;
        this.memberRepository = memberRepository;
        this.creditService = creditService;
        this.stripeProperties = stripeProperties;
    }

    public SubscriptionResponse subscribe(UUID memberId, CreateSubscriptionRequest request) {
        Member member = memberRepository.findByIdAndDeletedAtIsNull(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + memberId));

        // subscription.member_id is UNIQUE - a member can have at most one row,
        // ever. A CANCELLED row is reused (updated in place) for a resubscribe;
        // any other existing status means they're already subscribed.
        Subscription existing = subscriptionRepository.findByMemberId(memberId).orElse(null);
        if (existing != null && existing.getStatus() != SubscriptionStatus.CANCELLED) {
            throw new ConflictException("Member already has an active subscription");
        }

        try {
            String customerId = existing != null
                ? existing.getStripeCustomerId()
                : createStripeCustomer(member.getEmail(), request.paymentMethodId());
            com.stripe.model.Subscription stripeSubscription =
                createStripeSubscription(customerId, request.paymentMethodId());

            Subscription subscription = existing != null ? existing : new Subscription();
            subscription.setMember(member);
            subscription.setStripeCustomerId(customerId);
            subscription.setStripeSubscriptionId(stripeSubscription.getId());
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setCancelAtPeriodEnd(false);
            subscription.setCancelledAt(null);
            subscription.setPaymentFailedCount(0);
            subscription.setLastPaymentError(null);
            subscription.setCurrentPeriodStart(toLocalDate(stripeSubscription.getCurrentPeriodStart()));
            subscription.setCurrentPeriodEnd(toLocalDate(stripeSubscription.getCurrentPeriodEnd()));

            Subscription saved = subscriptionRepository.save(subscription);
            return SubscriptionResponse.fromEntity(saved);
        } catch (StripeException e) {
            throw new ConflictException("Unable to create subscription: " + e.getMessage());
        }
    }

    public SubscriptionResponse cancel(UUID memberId) {
        Subscription subscription = subscriptionRepository.findByMemberId(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("No subscription found for this member"));

        if (subscription.getStatus() == SubscriptionStatus.CANCELLED) {
            throw new ConflictException("Subscription is already cancelled");
        }
        if (subscription.isCancelAtPeriodEnd()) {
            throw new ConflictException("Subscription is already scheduled for cancellation");
        }

        try {
            SubscriptionUpdateParams params = SubscriptionUpdateParams.builder()
                .setCancelAtPeriodEnd(true)
                .build();
            com.stripe.model.Subscription.retrieve(subscription.getStripeSubscriptionId()).update(params);
        } catch (StripeException e) {
            throw new ConflictException("Unable to cancel subscription: " + e.getMessage());
        }

        // The member stays ACTIVE until the period actually ends - the
        // customer.subscription.deleted webhook (processWebhookEvent below) is
        // what eventually flips status to CANCELLED, matching what they
        // already paid for.
        subscription.setCancelAtPeriodEnd(true);
        Subscription saved = subscriptionRepository.save(subscription);
        return SubscriptionResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public SubscriptionResponse getMySubscription(UUID memberId) {
        Subscription subscription = subscriptionRepository.findByMemberId(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("No subscription found for this member"));
        return SubscriptionResponse.fromEntity(subscription);
    }

    // Idempotent Stripe webhook entry point (called from StripeWebhookController
    // after signature verification). Mirrors the existing check-then-insert +
    // UNIQUE-constraint-backstop convention this codebase already uses for
    // exactly this class of race (see V005's cafe/drink uniqueness indexes,
    // and CafeService/DrinkService's own existsBy... pre-checks): the
    // existence check below handles the common case (a genuine Stripe
    // redelivery arriving after the first one already committed) cheaply,
    // while stripe_event_id's UNIQUE constraint is the backstop for the rare
    // case of two deliveries racing each other. The marker is inserted LAST,
    // deliberately NOT caught here - if it violates the unique constraint
    // (the race case), that exception propagates, rolling back this ENTIRE
    // transaction (the credit grant included) via the existing
    // DataIntegrityViolationException -> 409 handling in
    // GlobalExceptionHandler, exactly matching what Stripe expects: a
    // non-2xx response tells it to retry, and the retry's existence check
    // then finds the row the other, successful transaction already
    // committed. (An earlier version of this method tried to catch the
    // violation mid-transaction and continue - that doesn't work: PostgreSQL
    // aborts the whole transaction after any failed statement regardless of
    // whether the Java exception is caught, so every later statement in the
    // same transaction fails too.)
    public void processWebhookEvent(Event event) {
        if (processedWebhookEventRepository.existsByStripeEventId(event.getId())) {
            log.info("Ignoring duplicate Stripe webhook delivery for event {}", event.getId());
            return;
        }

        switch (event.getType()) {
            case EVENT_INVOICE_PAYMENT_SUCCEEDED -> handleInvoicePaymentSucceeded(event);
            case EVENT_INVOICE_PAYMENT_FAILED -> handleInvoicePaymentFailed(event);
            case EVENT_SUBSCRIPTION_UPDATED -> handleSubscriptionUpdated(event);
            case EVENT_SUBSCRIPTION_DELETED -> handleSubscriptionDeleted(event);
            default -> log.info("Ignoring unhandled Stripe event type {}", event.getType());
        }

        ProcessedWebhookEvent marker = new ProcessedWebhookEvent();
        marker.setStripeEventId(event.getId());
        marker.setEventType(event.getType());
        processedWebhookEventRepository.save(marker);
    }

    // The only path that ever grants credits or flips Member.status to ACTIVE -
    // creating a Stripe Subscription (subscribe() above) is not proof payment
    // succeeded; this confirmed webhook is. Non-rollover is enforced by
    // CreditService.resetAndGrantMonthlyCredits zeroing any leftover balance
    // before granting the new period's 30.
    private void handleInvoicePaymentSucceeded(Event event) {
        Invoice invoice = extractStripeObject(event, Invoice.class);
        if (invoice == null || invoice.getSubscription() == null) {
            return;
        }

        Subscription subscription = subscriptionRepository.findByStripeSubscriptionId(invoice.getSubscription())
            .orElse(null);
        if (subscription == null) {
            log.warn("Received {} for unknown subscription {}", EVENT_INVOICE_PAYMENT_SUCCEEDED, invoice.getSubscription());
            return;
        }

        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setPaymentFailedCount(0);
        subscription.setLastPaymentError(null);
        refreshPeriodFromStripe(subscription);
        subscriptionRepository.save(subscription);

        Member member = subscription.getMember();
        member.setStatus(MemberStatus.ACTIVE);
        memberRepository.save(member);

        creditService.resetAndGrantMonthlyCredits(member.getId(), "subscription:" + subscription.getId());
    }

    // Stripe retries a failed invoice payment on its own schedule - Member.status
    // deliberately does NOT change here (see class Javadoc); only the
    // subscription's own diagnostic counters do. A human/admin decision (or a
    // later customer.subscription.updated/deleted event reflecting Stripe's own
    // retry exhaustion) is what actually changes membership state.
    private void handleInvoicePaymentFailed(Event event) {
        Invoice invoice = extractStripeObject(event, Invoice.class);
        if (invoice == null || invoice.getSubscription() == null) {
            return;
        }

        subscriptionRepository.findByStripeSubscriptionId(invoice.getSubscription()).ifPresent(subscription -> {
            subscription.setPaymentFailedCount(subscription.getPaymentFailedCount() + 1);
            subscription.setLastPaymentError("Payment failed for invoice " + invoice.getId());
            subscriptionRepository.save(subscription);
        });
    }

    // Syncs cancel_at_period_end from Stripe's own record - covers the case
    // where the cancellation was initiated directly in the Stripe dashboard
    // rather than through cancel() above.
    private void handleSubscriptionUpdated(Event event) {
        com.stripe.model.Subscription stripeSubscription = extractStripeObject(event, com.stripe.model.Subscription.class);
        if (stripeSubscription == null) {
            return;
        }

        subscriptionRepository.findByStripeSubscriptionId(stripeSubscription.getId()).ifPresent(subscription -> {
            subscription.setCancelAtPeriodEnd(Boolean.TRUE.equals(stripeSubscription.getCancelAtPeriodEnd()));
            subscriptionRepository.save(subscription);
        });
    }

    // The period the member already paid for has genuinely ended (or the
    // subscription was cancelled immediately) - this is the only place
    // Member.status transitions to CANCELLED.
    private void handleSubscriptionDeleted(Event event) {
        com.stripe.model.Subscription stripeSubscription = extractStripeObject(event, com.stripe.model.Subscription.class);
        if (stripeSubscription == null) {
            return;
        }

        subscriptionRepository.findByStripeSubscriptionId(stripeSubscription.getId()).ifPresent(subscription -> {
            subscription.setStatus(SubscriptionStatus.CANCELLED);
            subscription.setCancelledAt(Instant.now());
            subscriptionRepository.save(subscription);

            Member member = subscription.getMember();
            member.setStatus(MemberStatus.CANCELLED);
            memberRepository.save(member);
        });
    }

    private <T extends StripeObject> T extractStripeObject(Event event, Class<T> type) {
        return event.getDataObjectDeserializer().getObject()
            .filter(type::isInstance)
            .map(type::cast)
            .orElse(null);
    }

    private void refreshPeriodFromStripe(Subscription subscription) {
        try {
            com.stripe.model.Subscription stripeSubscription =
                com.stripe.model.Subscription.retrieve(subscription.getStripeSubscriptionId());
            subscription.setCurrentPeriodStart(toLocalDate(stripeSubscription.getCurrentPeriodStart()));
            subscription.setCurrentPeriodEnd(toLocalDate(stripeSubscription.getCurrentPeriodEnd()));
        } catch (StripeException e) {
            // Non-fatal: the credit grant still proceeds using the period info
            // already on file rather than failing the whole webhook.
            log.warn("Unable to refresh subscription period from Stripe for {}: {}",
                subscription.getStripeSubscriptionId(), e.getMessage());
        }
    }

    private String createStripeCustomer(String email, String paymentMethodId) throws StripeException {
        CustomerCreateParams params = CustomerCreateParams.builder()
            .setEmail(email)
            .setPaymentMethod(paymentMethodId)
            .setInvoiceSettings(
                CustomerCreateParams.InvoiceSettings.builder()
                    .setDefaultPaymentMethod(paymentMethodId)
                    .build())
            .build();
        Customer customer = Customer.create(params);
        return customer.getId();
    }

    private com.stripe.model.Subscription createStripeSubscription(String customerId, String paymentMethodId)
            throws StripeException {
        SubscriptionCreateParams params = SubscriptionCreateParams.builder()
            .setCustomer(customerId)
            .setDefaultPaymentMethod(paymentMethodId)
            .addItem(SubscriptionCreateParams.Item.builder()
                .setPrice(stripeProperties.getPriceId())
                .build())
            .build();
        return com.stripe.model.Subscription.create(params);
    }

    private LocalDate toLocalDate(Long epochSeconds) {
        return epochSeconds == null ? null : Instant.ofEpochSecond(epochSeconds).atZone(ZoneOffset.UTC).toLocalDate();
    }
}
