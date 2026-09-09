package com.socialcup.subscription.service;

import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.config.StripeProperties;
import com.socialcup.credit.service.CreditService;
import com.socialcup.subscription.dto.CreateSubscriptionRequest;
import com.socialcup.subscription.dto.SubscriptionResponse;
import com.socialcup.subscription.entity.Subscription;
import com.socialcup.subscription.entity.SubscriptionStatus;
import com.socialcup.subscription.repository.ProcessedWebhookEventRepository;
import com.socialcup.subscription.repository.SubscriptionRepository;
import com.socialcup.user.entity.Member;
import com.socialcup.user.repository.MemberRepository;
import com.stripe.exception.ApiConnectionException;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import com.stripe.model.StripeObject;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.SubscriptionCreateParams;
import com.stripe.param.SubscriptionUpdateParams;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    private static final UUID MEMBER_ID = UUID.randomUUID();

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private ProcessedWebhookEventRepository processedWebhookEventRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private CreditService creditService;

    @Mock
    private StripeProperties stripeProperties;

    private SubscriptionService subscriptionService;

    @BeforeEach
    void setUp() {
        subscriptionService = new SubscriptionService(
            subscriptionRepository, processedWebhookEventRepository, memberRepository, creditService, stripeProperties);
    }

    private static Member newMember(UUID id) {
        Member member = new Member();
        member.setId(id);
        member.setEmail("ada@example.com");
        return member;
    }

    private static com.stripe.model.Subscription stripeSubscription(String id) {
        com.stripe.model.Subscription stripeSubscription = mock(com.stripe.model.Subscription.class);
        when(stripeSubscription.getId()).thenReturn(id);
        when(stripeSubscription.getCurrentPeriodStart()).thenReturn(1_700_000_000L);
        when(stripeSubscription.getCurrentPeriodEnd()).thenReturn(1_702_592_000L);
        return stripeSubscription;
    }

    // ---- Subscribe: new member ----

    @Test
    void subscribe_newMember_createsStripeCustomerAndSubscription_andPersistsLocally() throws Exception {
        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(newMember(MEMBER_ID)));
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.empty());
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        Customer stripeCustomer = mock(Customer.class);
        when(stripeCustomer.getId()).thenReturn("cus_123");
        com.stripe.model.Subscription stripeSub = stripeSubscription("sub_123");

        try (MockedStatic<Customer> customerStatic = mockStatic(Customer.class);
             MockedStatic<com.stripe.model.Subscription> subStatic = mockStatic(com.stripe.model.Subscription.class)) {
            customerStatic.when(() -> Customer.create(any(CustomerCreateParams.class))).thenReturn(stripeCustomer);
            subStatic.when(() -> com.stripe.model.Subscription.create(any(SubscriptionCreateParams.class)))
                .thenReturn(stripeSub);

            SubscriptionResponse response = subscriptionService.subscribe(
                MEMBER_ID, new CreateSubscriptionRequest("pm_123"));

            assertThat(response.status()).isEqualTo(SubscriptionStatus.ACTIVE);
            assertThat(response.cancelAtPeriodEnd()).isFalse();
        }

        ArgumentCaptor<Subscription> captor = ArgumentCaptor.forClass(Subscription.class);
        verify(subscriptionRepository).save(captor.capture());
        assertThat(captor.getValue().getStripeCustomerId()).isEqualTo("cus_123");
        assertThat(captor.getValue().getStripeSubscriptionId()).isEqualTo("sub_123");
        assertThat(captor.getValue().getCurrentPeriodStart()).isEqualTo(LocalDate.of(2023, 11, 14));
    }

    @Test
    void subscribe_forUnknownMember_throwsResourceNotFound() {
        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> subscriptionService.subscribe(MEMBER_ID, new CreateSubscriptionRequest("pm_123")))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    void subscribe_whenAlreadyActivelySubscribed_throwsConflict() {
        Subscription existing = new Subscription();
        existing.setStatus(SubscriptionStatus.ACTIVE);
        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(newMember(MEMBER_ID)));
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> subscriptionService.subscribe(MEMBER_ID, new CreateSubscriptionRequest("pm_123")))
            .isInstanceOf(ConflictException.class);

        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    void subscribe_afterPreviousCancellation_reusesTheExistingStripeCustomer_ratherThanCreatingANewOne() throws Exception {
        Subscription existing = new Subscription();
        existing.setStatus(SubscriptionStatus.CANCELLED);
        existing.setStripeCustomerId("cus_existing");
        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(newMember(MEMBER_ID)));
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.of(existing));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));
        com.stripe.model.Subscription stripeSub = stripeSubscription("sub_new");

        try (MockedStatic<Customer> customerStatic = mockStatic(Customer.class);
             MockedStatic<com.stripe.model.Subscription> subStatic = mockStatic(com.stripe.model.Subscription.class)) {
            subStatic.when(() -> com.stripe.model.Subscription.create(any(SubscriptionCreateParams.class)))
                .thenReturn(stripeSub);

            subscriptionService.subscribe(MEMBER_ID, new CreateSubscriptionRequest("pm_123"));

            customerStatic.verify(() -> Customer.create(any(CustomerCreateParams.class)), never());
        }

        ArgumentCaptor<Subscription> captor = ArgumentCaptor.forClass(Subscription.class);
        verify(subscriptionRepository).save(captor.capture());
        assertThat(captor.getValue().getStripeCustomerId()).isEqualTo("cus_existing");
        assertThat(captor.getValue().getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
    }

    @Test
    void subscribe_whenStripeThrows_propagatesAsConflict_andPersistsNothing() {
        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(newMember(MEMBER_ID)));
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.empty());

        try (MockedStatic<Customer> customerStatic = mockStatic(Customer.class)) {
            customerStatic.when(() -> Customer.create(any(CustomerCreateParams.class)))
                .thenThrow(new ApiConnectionException("Stripe unreachable"));

            assertThatThrownBy(() -> subscriptionService.subscribe(MEMBER_ID, new CreateSubscriptionRequest("pm_123")))
                .isInstanceOf(ConflictException.class);
        }

        verify(subscriptionRepository, never()).save(any());
    }

    // ---- Cancel ----

    @Test
    void cancel_success_setsCancelAtPeriodEnd_withoutChangingStatusYet() throws Exception {
        Subscription existing = new Subscription();
        existing.setStatus(SubscriptionStatus.ACTIVE);
        existing.setStripeSubscriptionId("sub_123");
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.of(existing));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        com.stripe.model.Subscription retrieved = mock(com.stripe.model.Subscription.class);
        when(retrieved.update(any(SubscriptionUpdateParams.class))).thenReturn(retrieved);

        try (MockedStatic<com.stripe.model.Subscription> subStatic = mockStatic(com.stripe.model.Subscription.class)) {
            subStatic.when(() -> com.stripe.model.Subscription.retrieve("sub_123")).thenReturn(retrieved);

            SubscriptionResponse response = subscriptionService.cancel(MEMBER_ID);

            assertThat(response.cancelAtPeriodEnd()).isTrue();
            assertThat(response.status()).isEqualTo(SubscriptionStatus.ACTIVE);
        }
    }

    @Test
    void cancel_withNoSubscription_throwsResourceNotFound() {
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> subscriptionService.cancel(MEMBER_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void cancel_alreadyCancelled_throwsConflict() {
        Subscription existing = new Subscription();
        existing.setStatus(SubscriptionStatus.CANCELLED);
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> subscriptionService.cancel(MEMBER_ID))
            .isInstanceOf(ConflictException.class);
    }

    @Test
    void cancel_alreadyScheduledForCancellation_throwsConflict() {
        Subscription existing = new Subscription();
        existing.setStatus(SubscriptionStatus.ACTIVE);
        existing.setCancelAtPeriodEnd(true);
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> subscriptionService.cancel(MEMBER_ID))
            .isInstanceOf(ConflictException.class);
    }

    // ---- Cancel immediately (account deletion) ----

    @Test
    void cancelImmediatelyForAccountDeletion_activeSubscription_cancelsInStripeRightAway_andMarksCancelledLocally()
            throws Exception {
        Subscription existing = new Subscription();
        existing.setStatus(SubscriptionStatus.ACTIVE);
        existing.setStripeSubscriptionId("sub_123");
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.of(existing));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        com.stripe.model.Subscription retrieved = mock(com.stripe.model.Subscription.class);
        when(retrieved.cancel()).thenReturn(retrieved);

        try (MockedStatic<com.stripe.model.Subscription> subStatic = mockStatic(com.stripe.model.Subscription.class)) {
            subStatic.when(() -> com.stripe.model.Subscription.retrieve("sub_123")).thenReturn(retrieved);

            subscriptionService.cancelImmediatelyForAccountDeletion(MEMBER_ID);

            // The immediate path, never the graceful update() used by cancel()
            // above - a deleted account must stop being billed right away.
            org.mockito.Mockito.verify(retrieved, never()).update(any(SubscriptionUpdateParams.class));
        }

        assertThat(existing.getStatus()).isEqualTo(SubscriptionStatus.CANCELLED);
        assertThat(existing.getCancelledAt()).isNotNull();
    }

    @Test
    void cancelImmediatelyForAccountDeletion_pastDueSubscription_isAlsoCancelled() throws Exception {
        Subscription existing = new Subscription();
        existing.setStatus(SubscriptionStatus.PAST_DUE);
        existing.setStripeSubscriptionId("sub_123");
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.of(existing));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        com.stripe.model.Subscription retrieved = mock(com.stripe.model.Subscription.class);
        when(retrieved.cancel()).thenReturn(retrieved);

        try (MockedStatic<com.stripe.model.Subscription> subStatic = mockStatic(com.stripe.model.Subscription.class)) {
            subStatic.when(() -> com.stripe.model.Subscription.retrieve("sub_123")).thenReturn(retrieved);

            subscriptionService.cancelImmediatelyForAccountDeletion(MEMBER_ID);
        }

        assertThat(existing.getStatus()).isEqualTo(SubscriptionStatus.CANCELLED);
    }

    @Test
    void cancelImmediatelyForAccountDeletion_noSubscription_isASilentNoOp() {
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.empty());

        subscriptionService.cancelImmediatelyForAccountDeletion(MEMBER_ID);

        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    void cancelImmediatelyForAccountDeletion_alreadyCancelled_doesNotCallStripeAgain() {
        Subscription existing = new Subscription();
        existing.setStatus(SubscriptionStatus.CANCELLED);
        existing.setStripeSubscriptionId("sub_123");
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.of(existing));

        try (MockedStatic<com.stripe.model.Subscription> subStatic = mockStatic(com.stripe.model.Subscription.class)) {
            subscriptionService.cancelImmediatelyForAccountDeletion(MEMBER_ID);

            subStatic.verify(() -> com.stripe.model.Subscription.retrieve(any()), never());
        }

        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    void cancelImmediatelyForAccountDeletion_whenStripeThrows_propagatesAsConflict_andDoesNotChangeLocalStatus()
            throws Exception {
        Subscription existing = new Subscription();
        existing.setStatus(SubscriptionStatus.ACTIVE);
        existing.setStripeSubscriptionId("sub_123");
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.of(existing));

        com.stripe.model.Subscription retrieved = mock(com.stripe.model.Subscription.class);
        when(retrieved.cancel()).thenThrow(new ApiConnectionException("Stripe unreachable"));

        try (MockedStatic<com.stripe.model.Subscription> subStatic = mockStatic(com.stripe.model.Subscription.class)) {
            subStatic.when(() -> com.stripe.model.Subscription.retrieve("sub_123")).thenReturn(retrieved);

            assertThatThrownBy(() -> subscriptionService.cancelImmediatelyForAccountDeletion(MEMBER_ID))
                .isInstanceOf(ConflictException.class);
        }

        assertThat(existing.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        verify(subscriptionRepository, never()).save(any());
    }

    // ---- Read ----

    @Test
    void getMySubscription_withNoSubscription_throwsResourceNotFound() {
        when(subscriptionRepository.findByMemberId(MEMBER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> subscriptionService.getMySubscription(MEMBER_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- Webhook: invoice.payment_succeeded ----

    // A shared builder used across many scenarios - not every scenario's code
    // path reaches getDataObjectDeserializer() (e.g. a duplicate-delivery or
    // unknown-event-type test returns before ever needing it), so those two
    // stubs are lenient rather than strict.
    private static Event eventOf(String type, StripeObject dataObject) {
        Event event = mock(Event.class);
        when(event.getId()).thenReturn("evt_" + UUID.randomUUID());
        lenient().when(event.getType()).thenReturn(type);
        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        lenient().when(deserializer.getObject()).thenReturn(Optional.of(dataObject));
        lenient().when(event.getDataObjectDeserializer()).thenReturn(deserializer);
        return event;
    }

    @Test
    void processWebhookEvent_invoicePaymentSucceeded_grantsCredits_andActivatesTheMember() throws Exception {
        Member member = newMember(MEMBER_ID);
        Subscription subscription = new Subscription();
        subscription.setMember(member);
        subscription.setStripeSubscriptionId("sub_123");
        subscription.setStatus(SubscriptionStatus.PAST_DUE);
        when(subscriptionRepository.findByStripeSubscriptionId("sub_123")).thenReturn(Optional.of(subscription));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        Invoice invoice = mock(Invoice.class);
        when(invoice.getSubscription()).thenReturn("sub_123");
        Event event = eventOf("invoice.payment_succeeded", invoice);

        com.stripe.model.Subscription refreshed = mock(com.stripe.model.Subscription.class);
        when(refreshed.getCurrentPeriodStart()).thenReturn(1_700_000_000L);
        when(refreshed.getCurrentPeriodEnd()).thenReturn(1_702_592_000L);

        try (MockedStatic<com.stripe.model.Subscription> subStatic = mockStatic(com.stripe.model.Subscription.class)) {
            subStatic.when(() -> com.stripe.model.Subscription.retrieve("sub_123")).thenReturn(refreshed);

            subscriptionService.processWebhookEvent(event);
        }

        assertThat(subscription.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(member.getStatus()).isEqualTo(com.socialcup.user.entity.MemberStatus.ACTIVE);
        verify(creditService).resetAndGrantMonthlyCredits(eq(MEMBER_ID), any());
        verify(processedWebhookEventRepository).save(any());
    }

    @Test
    void processWebhookEvent_duplicateDelivery_isANoOp_creditsGrantedOnlyOnce() {
        when(processedWebhookEventRepository.existsByStripeEventId(any())).thenReturn(true);

        Invoice invoice = mock(Invoice.class);
        Event event = eventOf("invoice.payment_succeeded", invoice);

        subscriptionService.processWebhookEvent(event);

        verify(creditService, never()).resetAndGrantMonthlyCredits(any(), any());
        verify(subscriptionRepository, never()).findByStripeSubscriptionId(any());
    }

    @Test
    void processWebhookEvent_forUnknownSubscription_doesNothing() {
        Invoice invoice = mock(Invoice.class);
        when(invoice.getSubscription()).thenReturn("sub_unknown");
        when(subscriptionRepository.findByStripeSubscriptionId("sub_unknown")).thenReturn(Optional.empty());
        Event event = eventOf("invoice.payment_succeeded", invoice);

        subscriptionService.processWebhookEvent(event);

        verify(creditService, never()).resetAndGrantMonthlyCredits(any(), any());
    }

    // ---- Webhook: invoice.payment_failed ----

    @Test
    void processWebhookEvent_invoicePaymentFailed_incrementsCounter_withoutChangingMemberStatus() {
        Member member = newMember(MEMBER_ID);
        Subscription subscription = new Subscription();
        subscription.setMember(member);
        subscription.setStripeSubscriptionId("sub_123");
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setPaymentFailedCount(1);
        when(subscriptionRepository.findByStripeSubscriptionId("sub_123")).thenReturn(Optional.of(subscription));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        Invoice invoice = mock(Invoice.class);
        when(invoice.getSubscription()).thenReturn("sub_123");
        when(invoice.getId()).thenReturn("in_123");
        Event event = eventOf("invoice.payment_failed", invoice);

        subscriptionService.processWebhookEvent(event);

        assertThat(subscription.getPaymentFailedCount()).isEqualTo(2);
        assertThat(subscription.getLastPaymentError()).contains("in_123");
        assertThat(member.getStatus()).isNotEqualTo(com.socialcup.user.entity.MemberStatus.CANCELLED);
        verify(memberRepository, never()).save(any());
    }

    // ---- Webhook: customer.subscription.updated / deleted ----

    @Test
    void processWebhookEvent_subscriptionUpdated_syncsCancelAtPeriodEnd() {
        Subscription subscription = new Subscription();
        subscription.setStripeSubscriptionId("sub_123");
        subscription.setCancelAtPeriodEnd(false);
        when(subscriptionRepository.findByStripeSubscriptionId("sub_123")).thenReturn(Optional.of(subscription));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        com.stripe.model.Subscription stripeSubscription = mock(com.stripe.model.Subscription.class);
        when(stripeSubscription.getId()).thenReturn("sub_123");
        when(stripeSubscription.getCancelAtPeriodEnd()).thenReturn(true);
        Event event = eventOf("customer.subscription.updated", stripeSubscription);

        subscriptionService.processWebhookEvent(event);

        assertThat(subscription.isCancelAtPeriodEnd()).isTrue();
    }

    @Test
    void processWebhookEvent_subscriptionDeleted_cancelsSubscriptionAndMember() {
        Member member = newMember(MEMBER_ID);
        Subscription subscription = new Subscription();
        subscription.setMember(member);
        subscription.setStripeSubscriptionId("sub_123");
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        when(subscriptionRepository.findByStripeSubscriptionId("sub_123")).thenReturn(Optional.of(subscription));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        com.stripe.model.Subscription stripeSubscription = mock(com.stripe.model.Subscription.class);
        when(stripeSubscription.getId()).thenReturn("sub_123");
        Event event = eventOf("customer.subscription.deleted", stripeSubscription);

        subscriptionService.processWebhookEvent(event);

        assertThat(subscription.getStatus()).isEqualTo(SubscriptionStatus.CANCELLED);
        assertThat(subscription.getCancelledAt()).isNotNull();
        assertThat(member.getStatus()).isEqualTo(com.socialcup.user.entity.MemberStatus.CANCELLED);
    }

    @Test
    void processWebhookEvent_unknownEventType_isIgnored_withoutError() {
        Invoice invoice = mock(Invoice.class);
        Event event = eventOf("payment_intent.created", invoice);

        subscriptionService.processWebhookEvent(event);

        verify(subscriptionRepository, never()).findByStripeSubscriptionId(any());
        verify(creditService, never()).resetAndGrantMonthlyCredits(any(), any());
    }
}
