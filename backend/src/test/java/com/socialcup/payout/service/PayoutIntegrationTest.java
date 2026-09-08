package com.socialcup.payout.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.credit.service.CreditService;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.payout.dto.CalculatePayoutRequest;
import com.socialcup.payout.dto.PayoutResponse;
import com.socialcup.redemption.dto.CreateRedemptionCodeRequest;
import com.socialcup.redemption.dto.RedemptionCodeResponse;
import com.socialcup.redemption.service.RedemptionCodeService;
import com.socialcup.redemption.service.RedemptionService;
import com.socialcup.user.entity.Member;
import com.socialcup.user.repository.MemberRepository;
import org.junit.jupiter.api.Test;
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
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// Real PostgreSQL via Testcontainers, same convention as
// RedemptionIntegrationTest - proves that PayoutService.calculatePayout
// reflects each historical redemption's OWN snapshotted payout_rate, not the
// cafe's current rate, even when the cafe's rate changes between two
// redemptions inside the same payout period.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class PayoutIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private PayoutService payoutService;

    @Autowired
    private RedemptionCodeService redemptionCodeService;

    @Autowired
    private RedemptionService redemptionService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private CafeRepository cafeRepository;

    @Autowired
    private DrinkRepository drinkRepository;

    @Autowired
    private CreditService creditService;

    private Member seedMemberWithCredits() {
        Member member = new Member();
        member.setEmail("ada-" + UUID.randomUUID() + "@example.com");
        member.setFirstName("Ada");
        member = memberRepository.saveAndFlush(member);
        creditService.grantMonthlyCredits(member.getId(), "test-seed");
        return member;
    }

    private void redeemOneDrink(Cafe cafe, Drink drink) {
        Member member = seedMemberWithCredits();
        RedemptionCodeResponse code = redemptionCodeService.generateCode(
            member.getId(), new CreateRedemptionCodeRequest(drink.getId()));
        redemptionService.redeem(cafe.getId(), code.code());
    }

    @Test
    void calculatePayout_reflectsEachRedemptionsSnapshottedPayoutRate_notTheCafesCurrentRate() {
        Cafe cafe = new Cafe();
        cafe.setName("Blue Bottle Coffee " + UUID.randomUUID());
        cafe.setAddress("300 Main St");
        cafe.setPayoutRate(new BigDecimal("0.8000"));
        cafe = cafeRepository.saveAndFlush(cafe);

        Drink drink = new Drink();
        drink.setCafe(cafe);
        drink.setName("Oat Milk Latte " + UUID.randomUUID());
        drink.setCreditPrice(4);
        drink = drinkRepository.saveAndFlush(drink);

        // First redemption at payout_rate = 0.8000.
        redeemOneDrink(cafe, drink);

        // Cafe's payout rate changes AFTER the first redemption.
        Cafe managedCafe = cafeRepository.findById(cafe.getId()).orElseThrow();
        managedCafe.setPayoutRate(new BigDecimal("0.5000"));
        cafeRepository.saveAndFlush(managedCafe);

        // Second redemption at the NEW payout_rate = 0.5000.
        redeemOneDrink(cafe, drink);

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        PayoutResponse response = payoutService.calculatePayout(
            cafe.getId(), new CalculatePayoutRequest(today.minusDays(1), today.plusDays(1)));

        assertThat(response.totalRedemptions()).isEqualTo(2);
        assertThat(response.totalCredits()).isEqualTo(8);
        // 4 credits * 0.8000 (first redemption's snapshot) + 4 credits * 0.5000
        // (second redemption's snapshot) = 3.2000 + 2.0000 = 5.2000 - NOT
        // 8 * 0.5000 = 4.0000, which is what it would be if the calculation
        // wrongly used the cafe's current rate for both.
        assertThat(response.amountOwed()).isEqualByComparingTo("5.2000");
    }

    @Test
    void calculatePayout_duplicatePeriod_throwsConflictExceptionAndPersistsOnlyOne() {
        Cafe cafe = new Cafe();
        cafe.setName("Duplicate Period Cafe " + UUID.randomUUID());
        cafe.setAddress("400 Main St");
        final Cafe savedCafe = cafeRepository.saveAndFlush(cafe);

        LocalDate start = LocalDate.of(2026, 3, 1);
        LocalDate end = LocalDate.of(2026, 3, 31);
        CalculatePayoutRequest request = new CalculatePayoutRequest(start, end);

        PayoutResponse first = payoutService.calculatePayout(savedCafe.getId(), request);
        assertThat(first).isNotNull();

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> payoutService.calculatePayout(savedCafe.getId(), request))
            .isInstanceOf(com.socialcup.common.exception.ConflictException.class)
            .hasMessageContaining("already been calculated");

        org.assertj.core.api.Assertions.assertThat(payoutService.getPayoutsForCafe(savedCafe.getId())).hasSize(1);
    }

    @Test
    void calculatePayout_concurrentDuplicateRequests_resultsInExactlyOnePayoutAndOneConflict() throws Exception {
        Cafe cafe = new Cafe();
        cafe.setName("Concurrent Payout Cafe " + UUID.randomUUID());
        cafe.setAddress("500 Main St");
        final Cafe savedCafe = cafeRepository.saveAndFlush(cafe);

        LocalDate start = LocalDate.of(2026, 4, 1);
        LocalDate end = LocalDate.of(2026, 4, 30);
        CalculatePayoutRequest request = new CalculatePayoutRequest(start, end);

        int threads = 2;
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(threads);
        java.util.concurrent.CountDownLatch startLatch = new java.util.concurrent.CountDownLatch(1);
        java.util.List<java.util.concurrent.Future<Object>> futures = new java.util.ArrayList<>();

        for (int i = 0; i < threads; i++) {
            futures.add(executor.submit(() -> {
                startLatch.await();
                return payoutService.calculatePayout(savedCafe.getId(), request);
            }));
        }

        startLatch.countDown();
        executor.shutdown();

        int successes = 0;
        int conflicts = 0;

        for (java.util.concurrent.Future<Object> future : futures) {
            try {
                Object result = future.get();
                if (result instanceof PayoutResponse) {
                    successes++;
                }
            } catch (java.util.concurrent.ExecutionException ex) {
                if (ex.getCause() instanceof com.socialcup.common.exception.ConflictException) {
                    conflicts++;
                } else {
                    throw ex;
                }
            }
        }

        org.assertj.core.api.Assertions.assertThat(successes).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat(conflicts).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat(payoutService.getPayoutsForCafe(savedCafe.getId())).hasSize(1);
    }

    @Test
    void markPayoutAsPaid_persistsPaymentAndRejectsAlreadyPaid() {
        Cafe cafe = new Cafe();
        cafe.setName("Mark Paid Cafe " + UUID.randomUUID());
        cafe.setAddress("600 Main St");
        final Cafe savedCafe = cafeRepository.saveAndFlush(cafe);

        LocalDate start = LocalDate.of(2026, 5, 1);
        LocalDate end = LocalDate.of(2026, 5, 31);
        PayoutResponse calculated = payoutService.calculatePayout(savedCafe.getId(), new CalculatePayoutRequest(start, end));

        LocalDate paymentDate = LocalDate.of(2026, 6, 2);
        com.socialcup.payout.dto.MarkPayoutPaidRequest payRequest =
            new com.socialcup.payout.dto.MarkPayoutPaidRequest(new BigDecimal("25.00"), "BANK-REF-888", paymentDate);
        PayoutResponse paid = payoutService.markPayoutAsPaid(savedCafe.getId(), calculated.id(), payRequest);

        org.assertj.core.api.Assertions.assertThat(paid.amountPaid()).isEqualByComparingTo("25.00");
        org.assertj.core.api.Assertions.assertThat(paid.paymentReference()).isEqualTo("BANK-REF-888");
        org.assertj.core.api.Assertions.assertThat(paid.paymentDate()).isEqualTo(paymentDate);

        // Second attempt must fail with ConflictException
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> payoutService.markPayoutAsPaid(savedCafe.getId(), calculated.id(), payRequest))
            .isInstanceOf(com.socialcup.common.exception.ConflictException.class)
            .hasMessageContaining("already been marked as paid");
    }

    // Proves the mark-paid concurrency fix (PayoutRepository.findByIdAndCafeIdForUpdate,
    // a PESSIMISTIC_WRITE lock) against a real PostgreSQL instance: two threads
    // race to mark the SAME payout as paid, synchronized to start together via
    // a CountDownLatch (not run sequentially) - exactly one must succeed and
    // the other must receive the existing already-paid ConflictException,
    // never both silently overwriting each other.
    @Test
    void markPayoutAsPaid_concurrentRequests_exactlyOneSucceedsAndOneConflicts() throws Exception {
        Cafe cafe = new Cafe();
        cafe.setName("Concurrent Mark Paid Cafe " + UUID.randomUUID());
        cafe.setAddress("800 Main St");
        final Cafe savedCafe = cafeRepository.saveAndFlush(cafe);

        LocalDate periodStart = LocalDate.of(2026, 8, 1);
        LocalDate periodEnd = LocalDate.of(2026, 8, 31);
        PayoutResponse calculated = payoutService.calculatePayout(
            savedCafe.getId(), new CalculatePayoutRequest(periodStart, periodEnd));

        int threads = 2;
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(threads);
        java.util.concurrent.CountDownLatch startLatch = new java.util.concurrent.CountDownLatch(1);
        java.util.List<java.util.concurrent.Future<Object>> futures = new java.util.ArrayList<>();

        for (int i = 0; i < threads; i++) {
            String reference = "CONCURRENT-REF-" + i;
            futures.add(executor.submit(() -> {
                startLatch.await();
                com.socialcup.payout.dto.MarkPayoutPaidRequest payRequest = new com.socialcup.payout.dto.MarkPayoutPaidRequest(
                    new BigDecimal("25.00"), reference, LocalDate.of(2026, 9, 1));
                return payoutService.markPayoutAsPaid(savedCafe.getId(), calculated.id(), payRequest);
            }));
        }

        startLatch.countDown();
        executor.shutdown();

        int successes = 0;
        int conflicts = 0;

        for (java.util.concurrent.Future<Object> future : futures) {
            try {
                Object result = future.get();
                if (result instanceof PayoutResponse) {
                    successes++;
                }
            } catch (java.util.concurrent.ExecutionException ex) {
                if (ex.getCause() instanceof com.socialcup.common.exception.ConflictException) {
                    conflicts++;
                } else {
                    throw ex;
                }
            }
        }

        org.assertj.core.api.Assertions.assertThat(successes).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat(conflicts).isEqualTo(1);

        // Exactly one final payment record - re-reading fresh from the
        // database (not either thread's in-memory result) proves the row
        // itself, not just the two callers' local views, agrees.
        PayoutResponse finalState = payoutService.getPayoutsForCafe(savedCafe.getId()).stream()
            .filter(p -> p.id().equals(calculated.id()))
            .findFirst()
            .orElseThrow();

        org.assertj.core.api.Assertions.assertThat(finalState.amountPaid()).isEqualByComparingTo("25.00");
        org.assertj.core.api.Assertions.assertThat(finalState.paymentReference()).isIn("CONCURRENT-REF-0", "CONCURRENT-REF-1");
        org.assertj.core.api.Assertions.assertThat(payoutService.getPayoutsForCafe(savedCafe.getId())).hasSize(1);

        // The payout remains associated with the original cafe and its
        // calculation is untouched by the payment race.
        org.assertj.core.api.Assertions.assertThat(finalState.cafeId()).isEqualTo(savedCafe.getId());
        org.assertj.core.api.Assertions.assertThat(finalState.periodStart()).isEqualTo(periodStart);
        org.assertj.core.api.Assertions.assertThat(finalState.periodEnd()).isEqualTo(periodEnd);
        org.assertj.core.api.Assertions.assertThat(finalState.amountOwed()).isEqualByComparingTo(calculated.amountOwed());
        org.assertj.core.api.Assertions.assertThat(finalState.totalRedemptions()).isEqualTo(calculated.totalRedemptions());
        org.assertj.core.api.Assertions.assertThat(finalState.totalCredits()).isEqualTo(calculated.totalCredits());
    }

    @Test
    void getAllPayouts_returnsPayoutsAcrossDifferentCafes() {
        Cafe cafe1 = new Cafe();
        cafe1.setName("Cross Cafe 1 " + UUID.randomUUID());
        cafe1.setAddress("701 Main St");
        Cafe savedCafe1 = cafeRepository.saveAndFlush(cafe1);

        Cafe cafe2 = new Cafe();
        cafe2.setName("Cross Cafe 2 " + UUID.randomUUID());
        cafe2.setAddress("702 Main St");
        Cafe savedCafe2 = cafeRepository.saveAndFlush(cafe2);

        payoutService.calculatePayout(savedCafe1.getId(), new CalculatePayoutRequest(LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)));
        payoutService.calculatePayout(savedCafe2.getId(), new CalculatePayoutRequest(LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31)));

        java.util.List<PayoutResponse> all = payoutService.getAllPayouts();
        java.util.List<UUID> cafeIds = all.stream().map(PayoutResponse::cafeId).toList();

        org.assertj.core.api.Assertions.assertThat(cafeIds).contains(savedCafe1.getId(), savedCafe2.getId());
    }
}
