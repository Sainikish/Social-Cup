package com.socialcup.subscription.service;

import com.socialcup.credit.entity.CreditLedger;
import com.socialcup.credit.entity.CreditLedgerType;
import com.socialcup.credit.repository.CreditLedgerRepository;
import com.socialcup.subscription.entity.Subscription;
import com.socialcup.subscription.entity.SubscriptionStatus;
import com.socialcup.subscription.repository.SubscriptionRepository;
import com.socialcup.user.entity.Member;
import com.socialcup.user.entity.MemberStatus;
import com.socialcup.user.repository.MemberRepository;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

// Real PostgreSQL via Testcontainers, same convention as
// RedemptionConcurrencyIntegrationTest - proves the processed_webhook_event
// UNIQUE constraint (added by V007) actually gates duplicate/redelivered
// Stripe events against a real database, not a mocked repository.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class SubscriptionWebhookIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private SubscriptionService subscriptionService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private CreditLedgerRepository creditLedgerRepository;

    private static Event invoicePaymentSucceededEvent(String eventId, String stripeSubscriptionId) {
        Invoice invoice = mock(Invoice.class);
        when(invoice.getSubscription()).thenReturn(stripeSubscriptionId);
        Event event = mock(Event.class);
        when(event.getId()).thenReturn(eventId);
        when(event.getType()).thenReturn("invoice.payment_succeeded");
        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.of(invoice));
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);
        return event;
    }

    @Test
    void duplicateWebhookDelivery_grantsCreditsExactlyOnce_andActivatesTheMemberOnce() {
        Member newMember = new Member();
        newMember.setEmail("ada-" + UUID.randomUUID() + "@example.com");
        newMember.setFirstName("Ada");
        newMember.setStatus(MemberStatus.VISITOR);
        final Member member = memberRepository.saveAndFlush(newMember);

        Subscription newSubscription = new Subscription();
        newSubscription.setMember(member);
        newSubscription.setStripeSubscriptionId("sub_" + UUID.randomUUID());
        newSubscription.setStripeCustomerId("cus_" + UUID.randomUUID());
        newSubscription.setStatus(SubscriptionStatus.PAST_DUE);
        final Subscription subscription = subscriptionRepository.saveAndFlush(newSubscription);

        String eventId = "evt_" + UUID.randomUUID();
        Event event = invoicePaymentSucceededEvent(eventId, subscription.getStripeSubscriptionId());

        com.stripe.model.Subscription refreshed = mock(com.stripe.model.Subscription.class);
        when(refreshed.getCurrentPeriodStart()).thenReturn(1_700_000_000L);
        when(refreshed.getCurrentPeriodEnd()).thenReturn(1_702_592_000L);

        try (MockedStatic<com.stripe.model.Subscription> subStatic = mockStatic(com.stripe.model.Subscription.class)) {
            subStatic.when(() -> com.stripe.model.Subscription.retrieve(subscription.getStripeSubscriptionId()))
                .thenReturn(refreshed);

            // First delivery of this Stripe event - processes normally.
            subscriptionService.processWebhookEvent(event);
            // A second delivery of the SAME event id (Stripe redelivery, or two
            // concurrent requests) - must be rejected by the
            // processed_webhook_event UNIQUE constraint and treated as a no-op.
            subscriptionService.processWebhookEvent(event);
        }

        Member reloadedMember = memberRepository.findById(member.getId()).orElseThrow();
        assertThat(reloadedMember.getStatus()).isEqualTo(MemberStatus.ACTIVE);

        List<CreditLedger> grants = creditLedgerRepository.findAll().stream()
            .filter(entry -> entry.getMember().getId().equals(member.getId()))
            .filter(entry -> entry.getType() == CreditLedgerType.MONTHLY_GRANT)
            .toList();
        assertThat(grants).hasSize(1);
        assertThat(grants.get(0).getAmount()).isEqualTo(30);
    }
}
