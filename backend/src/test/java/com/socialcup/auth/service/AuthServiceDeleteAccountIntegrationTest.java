package com.socialcup.auth.service;

import com.socialcup.admin.entity.AuditLog;
import com.socialcup.admin.repository.AuditLogRepository;
import com.socialcup.auth.dto.AuthResponse;
import com.socialcup.auth.dto.RegisterRequest;
import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.credit.entity.CreditLedger;
import com.socialcup.credit.entity.CreditLedgerType;
import com.socialcup.credit.repository.CreditLedgerRepository;
import com.socialcup.credit.service.CreditService;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.payout.dto.CalculatePayoutRequest;
import com.socialcup.payout.dto.PayoutResponse;
import com.socialcup.payout.service.PayoutService;
import com.socialcup.redemption.dto.CreateRedemptionCodeRequest;
import com.socialcup.redemption.dto.RedemptionCodeResponse;
import com.socialcup.redemption.entity.Redemption;
import com.socialcup.redemption.entity.RedemptionCode;
import com.socialcup.redemption.repository.RedemptionCodeRepository;
import com.socialcup.redemption.repository.RedemptionRepository;
import com.socialcup.redemption.service.RedemptionCodeService;
import com.socialcup.redemption.service.RedemptionService;
import com.socialcup.subscription.entity.Subscription;
import com.socialcup.subscription.entity.SubscriptionStatus;
import com.socialcup.subscription.repository.SubscriptionRepository;
import com.socialcup.user.entity.Member;
import com.socialcup.user.repository.MemberRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

// Real PostgreSQL via Testcontainers, same convention as
// RedemptionIntegrationTest - proves the actual FK/cascade behavior a mocked
// repository can't: that deleting a member's account never touches the
// historical redemption/credit_ledger/subscription rows other tables' FKs
// point at, and that the deleted member's own redemption code and email
// really do behave as designed against a real database.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class AuthServiceDeleteAccountIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private AuthService authService;

    @Autowired
    private RedemptionCodeService redemptionCodeService;

    @Autowired
    private RedemptionService redemptionService;

    @Autowired
    private RedemptionCodeRepository redemptionCodeRepository;

    @Autowired
    private RedemptionRepository redemptionRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private CafeRepository cafeRepository;

    @Autowired
    private DrinkRepository drinkRepository;

    @Autowired
    private CreditService creditService;

    @Autowired
    private CreditLedgerRepository creditLedgerRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PayoutService payoutService;

    private Member seedMemberWithCredits(int credits) {
        Member member = new Member();
        member.setEmail("ada-" + UUID.randomUUID() + "@example.com");
        member.setFirstName("Ada");
        member = memberRepository.saveAndFlush(member);
        if (credits > 0) {
            creditService.grantMonthlyCredits(member.getId(), "test-seed");
        }
        return member;
    }

    private Cafe seedCafe() {
        Cafe cafe = new Cafe();
        cafe.setName("Blue Bottle Coffee " + UUID.randomUUID());
        cafe.setAddress("300 Main St");
        return cafeRepository.saveAndFlush(cafe);
    }

    private Drink seedDrink(Cafe cafe, int creditPrice) {
        Drink drink = new Drink();
        drink.setCafe(cafe);
        drink.setName("Oat Milk Latte " + UUID.randomUUID());
        drink.setCreditPrice(creditPrice);
        return drinkRepository.saveAndFlush(drink);
    }

    private Subscription seedActiveSubscription(Member member, String stripeSubscriptionId) {
        Subscription subscription = new Subscription();
        subscription.setMember(member);
        subscription.setStripeCustomerId("cus_" + UUID.randomUUID());
        subscription.setStripeSubscriptionId(stripeSubscriptionId);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setCurrentPeriodStart(LocalDate.of(2026, 1, 1));
        subscription.setCurrentPeriodEnd(LocalDate.of(2026, 2, 1));
        return subscriptionRepository.saveAndFlush(subscription);
    }

    @Test
    void deleteAccount_aDeletedMembersStillLiveUnredeemedCode_canNoLongerBeRedeemed_andNoCreditsAreDeducted() {
        Member member = seedMemberWithCredits(30);
        Cafe cafe = seedCafe();
        Drink drink = seedDrink(cafe, 4);
        RedemptionCodeResponse generated = redemptionCodeService.generateCode(
            member.getId(), new CreateRedemptionCodeRequest(drink.getId()));

        authService.deleteAccount(member.getId());

        assertThatThrownBy(() -> redemptionService.redeem(cafe.getId(), generated.code()))
            .isInstanceOf(ResourceNotFoundException.class);

        RedemptionCode persistedCode = redemptionCodeRepository.findByCodeValue(generated.code()).orElseThrow();
        assertThat(persistedCode.isRedeemed()).isFalse();
        // Scoped to this member specifically - other test methods in this
        // class share the same Testcontainers Postgres instance and may have
        // their own redemption rows for OTHER members present at the same
        // time, so a whole-table count would be fragile against test order.
        assertThat(redemptionRepository.findAll().stream()
            .noneMatch(r -> r.getMember().getId().equals(member.getId()))).isTrue();

        List<CreditLedger> redemptionEntries = creditLedgerRepository.findAll().stream()
            .filter(entry -> entry.getMember().getId().equals(member.getId()))
            .filter(entry -> entry.getType() == CreditLedgerType.REDEMPTION)
            .toList();
        assertThat(redemptionEntries).isEmpty();
    }

    @Test
    void deleteAccount_historicalRedemptionAndCreditLedgerRecordsFromBeforeDeletion_remainUnchanged() {
        Member member = seedMemberWithCredits(30);
        Cafe cafe = seedCafe();
        Drink drink = seedDrink(cafe, 4);
        RedemptionCodeResponse generated = redemptionCodeService.generateCode(
            member.getId(), new CreateRedemptionCodeRequest(drink.getId()));
        redemptionService.redeem(cafe.getId(), generated.code());

        // Scoped to this member specifically - see the note in the previous
        // test about this class's tests sharing one Testcontainers instance.
        Redemption beforeDeletion = redemptionRepository.findAll().stream()
            .filter(r -> r.getMember().getId().equals(member.getId()))
            .findFirst()
            .orElseThrow();
        UUID redemptionId = beforeDeletion.getId();
        int creditsDeducted = beforeDeletion.getCreditsDeducted();
        BigDecimal payoutRate = beforeDeletion.getPayoutRate();
        long ledgerEntriesBefore = creditLedgerRepository.findAll().stream()
            .filter(entry -> entry.getMember().getId().equals(member.getId()))
            .count();

        authService.deleteAccount(member.getId());

        Redemption afterDeletion = redemptionRepository.findById(redemptionId).orElseThrow();
        assertThat(afterDeletion.getCreditsDeducted()).isEqualTo(creditsDeducted);
        assertThat(afterDeletion.getPayoutRate()).isEqualByComparingTo(payoutRate);
        assertThat(afterDeletion.getMember().getId()).isEqualTo(member.getId());

        long ledgerEntriesAfter = creditLedgerRepository.findAll().stream()
            .filter(entry -> entry.getMember().getId().equals(member.getId()))
            .count();
        assertThat(ledgerEntriesAfter).isEqualTo(ledgerEntriesBefore);
    }

    @Test
    void deleteAccount_historicalSubscriptionRow_survives_withOnlyStatusAndCancelledAtChanged() throws Exception {
        Member member = seedMemberWithCredits(0);
        Subscription seeded = seedActiveSubscription(member, "sub_" + UUID.randomUUID());
        String stripeSubscriptionId = seeded.getStripeSubscriptionId();
        String stripeCustomerId = seeded.getStripeCustomerId();
        LocalDate periodStart = seeded.getCurrentPeriodStart();
        LocalDate periodEnd = seeded.getCurrentPeriodEnd();

        com.stripe.model.Subscription stripeSubscription = mock(com.stripe.model.Subscription.class);
        when(stripeSubscription.cancel()).thenReturn(stripeSubscription);
        try (MockedStatic<com.stripe.model.Subscription> subStatic = mockStatic(com.stripe.model.Subscription.class)) {
            subStatic.when(() -> com.stripe.model.Subscription.retrieve(stripeSubscriptionId))
                .thenReturn(stripeSubscription);

            authService.deleteAccount(member.getId());
        }

        Subscription afterDeletion = subscriptionRepository.findById(seeded.getId()).orElseThrow();
        assertThat(afterDeletion.getStatus()).isEqualTo(SubscriptionStatus.CANCELLED);
        assertThat(afterDeletion.getCancelledAt()).isNotNull();
        // Everything else about the historical row is untouched.
        assertThat(afterDeletion.getStripeSubscriptionId()).isEqualTo(stripeSubscriptionId);
        assertThat(afterDeletion.getStripeCustomerId()).isEqualTo(stripeCustomerId);
        assertThat(afterDeletion.getCurrentPeriodStart()).isEqualTo(periodStart);
        assertThat(afterDeletion.getCurrentPeriodEnd()).isEqualTo(periodEnd);
    }

    // Proves the rollback guarantee against a REAL transaction, not just
    // mocked repositories (see AuthServiceTest's equivalent unit test) - a
    // Stripe failure must leave the member row, the subscription row, and
    // the audit log completely as they were, with nothing partially
    // anonymized.
    @Test
    void deleteAccount_whenStripeCancellationFails_rollsBackEverything_memberAndSubscriptionRemainCompletelyUnchanged()
            throws Exception {
        Member member = seedMemberWithCredits(0);
        Subscription seeded = seedActiveSubscription(member, "sub_" + UUID.randomUUID());
        String originalEmail = member.getEmail();
        String stripeSubscriptionId = seeded.getStripeSubscriptionId();

        com.stripe.model.Subscription stripeSubscription = mock(com.stripe.model.Subscription.class);
        when(stripeSubscription.cancel())
            .thenThrow(new com.stripe.exception.ApiConnectionException("Stripe unreachable"));

        try (MockedStatic<com.stripe.model.Subscription> subStatic = mockStatic(com.stripe.model.Subscription.class)) {
            subStatic.when(() -> com.stripe.model.Subscription.retrieve(stripeSubscriptionId))
                .thenReturn(stripeSubscription);

            assertThatThrownBy(() -> authService.deleteAccount(member.getId()))
                .isInstanceOf(com.socialcup.common.exception.ConflictException.class);
        }

        Member afterFailedAttempt = memberRepository.findById(member.getId()).orElseThrow();
        assertThat(afterFailedAttempt.getEmail()).isEqualTo(originalEmail);
        assertThat(afterFailedAttempt.getFirstName()).isEqualTo(member.getFirstName());
        assertThat(afterFailedAttempt.getDeletedAt()).isNull();

        Subscription subscriptionAfterFailedAttempt = subscriptionRepository.findById(seeded.getId()).orElseThrow();
        assertThat(subscriptionAfterFailedAttempt.getStatus()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(subscriptionAfterFailedAttempt.getCancelledAt()).isNull();

        boolean auditLogWritten = auditLogRepository.findAll().stream()
            .anyMatch(entry -> member.getId().toString().equals(entry.getEntityId()));
        assertThat(auditLogWritten).isFalse();
    }

    @Test
    void deleteAccount_aPayoutCalculationForAPreviousPeriod_producesTheSameFigures_beforeAndAfterDeletion() {
        Member member = seedMemberWithCredits(30);
        Cafe cafe = seedCafe();
        Drink drink = seedDrink(cafe, 4);
        RedemptionCodeResponse generated = redemptionCodeService.generateCode(
            member.getId(), new CreateRedemptionCodeRequest(drink.getId()));
        redemptionService.redeem(cafe.getId(), generated.code());

        LocalDate today = LocalDate.now();
        PayoutResponse beforeDeletion = payoutService.calculatePayout(
            cafe.getId(), new CalculatePayoutRequest(today.minusDays(1), today.plusDays(1)));

        authService.deleteAccount(member.getId());

        // calculatePayout itself refuses to recompute the same cafe+period
        // twice (see PayoutService) - recomputing the same figures directly
        // from the still-intact redemption rows is the honest way to prove
        // "same result before and after" without hitting that guard.
        List<Redemption> redemptionsAfterDeletion = redemptionRepository.findAll().stream()
            .filter(r -> r.getCafe().getId().equals(cafe.getId()))
            .toList();
        int totalCreditsAfter = redemptionsAfterDeletion.stream().mapToInt(Redemption::getCreditsDeducted).sum();
        BigDecimal amountOwedAfter = redemptionsAfterDeletion.stream()
            .map(r -> r.getPayoutRate().multiply(BigDecimal.valueOf(r.getCreditsDeducted())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(redemptionsAfterDeletion).hasSize(beforeDeletion.totalRedemptions());
        assertThat(totalCreditsAfter).isEqualTo(beforeDeletion.totalCredits());
        assertThat(amountOwedAfter).isEqualByComparingTo(beforeDeletion.amountOwed());
    }

    @Test
    void deleteAccount_theOriginalEmail_becomesAvailableForANewRegistration() {
        String originalEmail = "reused-" + UUID.randomUUID() + "@example.com";
        RegisterRequest originalRegistration = new RegisterRequest(originalEmail, "password123", "Ada", "Lovelace");
        AuthResponse originalResponse = authService.register(originalRegistration);
        UUID originalMemberId = originalResponse.user().id();

        authService.deleteAccount(originalMemberId);

        RegisterRequest newRegistration = new RegisterRequest(originalEmail, "differentPassword456", "Grace", "Hopper");
        AuthResponse newResponse = authService.register(newRegistration);

        assertThat(newResponse.user().id()).isNotEqualTo(originalMemberId);
        assertThat(newResponse.user().email()).isEqualTo(originalEmail);

        Member deletedMember = memberRepository.findById(originalMemberId).orElseThrow();
        assertThat(deletedMember.getEmail()).isNotEqualTo(originalEmail);
    }
}
