package com.socialcup.admin.service;

import com.socialcup.admin.dto.AdminDashboardMetricsResponse;
import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.payout.entity.Payout;
import com.socialcup.payout.repository.PayoutRepository;
import com.socialcup.redemption.entity.Redemption;
import com.socialcup.redemption.entity.RedemptionCode;
import com.socialcup.redemption.repository.RedemptionCodeRepository;
import com.socialcup.redemption.repository.RedemptionRepository;
import com.socialcup.user.entity.Member;
import com.socialcup.user.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// Real PostgreSQL via Testcontainers, same convention as
// AdminAuditLogIntegrationTest/AdminRedemptionIntegrationTest - proves the
// COUNT/SUM aggregations in AdminDashboardService actually execute correctly
// against a real database (including Postgres's own NULL-summing and
// zero-row behavior), not mocked repositories.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class AdminDashboardIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private AdminDashboardService adminDashboardService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private CafeRepository cafeRepository;

    @Autowired
    private DrinkRepository drinkRepository;

    @Autowired
    private RedemptionRepository redemptionRepository;

    @Autowired
    private RedemptionCodeRepository redemptionCodeRepository;

    @Autowired
    private PayoutRepository payoutRepository;

    // Every test in this class asserts on aggregates over the WHOLE table -
    // this class shares one Postgres container across all its @Test methods
    // (same lesson as AdminRedemptionIntegrationTest/AdminAuditLogIntegrationTest),
    // so without this cleanup, rows committed by an earlier method would leak
    // into a later method's counts/sums. Deleted in FK-safe order: payout and
    // redemption reference cafe/member/drink; redemption also references
    // redemption_code, which itself references member/cafe/drink.
    @BeforeEach
    void cleanDatabase() {
        payoutRepository.deleteAllInBatch();
        redemptionRepository.deleteAllInBatch();
        redemptionCodeRepository.deleteAllInBatch();
        drinkRepository.deleteAllInBatch();
        cafeRepository.deleteAllInBatch();
        memberRepository.deleteAllInBatch();
    }

    private Member seedMember(String email) {
        Member member = new Member();
        member.setEmail(email);
        return memberRepository.saveAndFlush(member);
    }

    private Cafe seedCafe(String name, BigDecimal payoutRate) {
        Cafe cafe = new Cafe();
        cafe.setName(name);
        cafe.setAddress("300 Main St");
        cafe.setPayoutRate(payoutRate);
        return cafeRepository.saveAndFlush(cafe);
    }

    private Drink seedDrink(Cafe cafe, String name, int creditPrice) {
        Drink drink = new Drink();
        drink.setCafe(cafe);
        drink.setName(name);
        drink.setCreditPrice(creditPrice);
        return drinkRepository.saveAndFlush(drink);
    }

    private Redemption seedRedemption(Member member, Cafe cafe, Drink drink, int creditsDeducted,
                                       BigDecimal payoutRate, Instant createdAt) {
        RedemptionCode code = new RedemptionCode();
        code.setMember(member);
        code.setCafe(cafe);
        code.setDrink(drink);
        code.setCodeValue("CODE-" + UUID.randomUUID());
        code.setBackupCode("BK" + UUID.randomUUID().toString().substring(0, 6));
        code.setValidUntil(Instant.now().plus(1, ChronoUnit.DAYS));
        code.setRedeemed(true);
        code.setRedeemedAt(createdAt);
        RedemptionCode savedCode = redemptionCodeRepository.saveAndFlush(code);

        Redemption redemption = new Redemption();
        redemption.setMember(member);
        redemption.setCafe(cafe);
        redemption.setDrink(drink);
        redemption.setCode(savedCode);
        redemption.setCreditsDeducted(creditsDeducted);
        redemption.setPayoutRate(payoutRate);
        redemption.setCreatedAt(createdAt);
        return redemptionRepository.saveAndFlush(redemption);
    }

    private Payout seedPayout(Cafe cafe, LocalDate periodStart, LocalDate periodEnd,
                              BigDecimal amountOwed, BigDecimal amountPaid) {
        Payout payout = new Payout();
        payout.setCafe(cafe);
        payout.setPeriodStart(periodStart);
        payout.setPeriodEnd(periodEnd);
        payout.setAmountOwed(amountOwed);
        payout.setAmountPaid(amountPaid);
        return payoutRepository.saveAndFlush(payout);
    }

    @Test
    void getMetrics_emptyDatabase_returnsAllZeroesNeverNull() {
        AdminDashboardMetricsResponse metrics = adminDashboardService.getMetrics();

        assertThat(metrics.totalMembers()).isZero();
        assertThat(metrics.totalActiveCafes()).isZero();
        assertThat(metrics.totalActiveDrinks()).isZero();
        assertThat(metrics.totalRedemptions()).isZero();
        assertThat(metrics.totalCreditsRedeemed()).isZero();
        assertThat(metrics.totalPayoutAmountOwed()).isNotNull().isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(metrics.totalPayoutAmountPaid()).isNotNull().isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void getMetrics_populatedAcrossMultipleCafesMembersDrinks_aggregatesCorrectly() {
        Member memberA = seedMember("a-" + UUID.randomUUID() + "@example.com");
        Member memberB = seedMember("b-" + UUID.randomUUID() + "@example.com");

        Cafe cafeA = seedCafe("Cafe A " + UUID.randomUUID(), new BigDecimal("0.8000"));
        Cafe cafeB = seedCafe("Cafe B " + UUID.randomUUID(), new BigDecimal("0.5000"));
        Cafe archivedCafe = seedCafe("Archived Cafe " + UUID.randomUUID(), new BigDecimal("0.5000"));
        archivedCafe.setStatus(CafeStatus.ARCHIVED);
        cafeRepository.saveAndFlush(archivedCafe);

        Drink drinkA = seedDrink(cafeA, "Latte " + UUID.randomUUID(), 4);
        Drink drinkB = seedDrink(cafeB, "Cold Brew " + UUID.randomUUID(), 3);
        Drink inactiveDrink = seedDrink(cafeA, "Discontinued " + UUID.randomUUID(), 5);
        inactiveDrink.setStatus(DrinkStatus.INACTIVE);
        drinkRepository.saveAndFlush(inactiveDrink);

        seedRedemption(memberA, cafeA, drinkA, 4, new BigDecimal("0.8000"), Instant.parse("2026-01-01T00:00:00Z"));
        seedRedemption(memberA, cafeB, drinkB, 3, new BigDecimal("0.5000"), Instant.parse("2026-01-02T00:00:00Z"));
        seedRedemption(memberB, cafeA, drinkA, 4, new BigDecimal("0.8000"), Instant.parse("2026-01-03T00:00:00Z"));

        seedPayout(cafeA, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), new BigDecimal("6.40"), new BigDecimal("6.40"));
        seedPayout(cafeB, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), new BigDecimal("1.50"), null);

        AdminDashboardMetricsResponse metrics = adminDashboardService.getMetrics();

        assertThat(metrics.totalMembers()).isEqualTo(2);
        assertThat(metrics.totalActiveCafes()).isEqualTo(2); // archivedCafe excluded
        assertThat(metrics.totalActiveDrinks()).isEqualTo(2); // inactiveDrink excluded
        assertThat(metrics.totalRedemptions()).isEqualTo(3);
        assertThat(metrics.totalCreditsRedeemed()).isEqualTo(11); // 4 + 3 + 4
        assertThat(metrics.totalPayoutAmountOwed()).isEqualByComparingTo("7.90"); // 6.40 + 1.50
        assertThat(metrics.totalPayoutAmountPaid()).isEqualByComparingTo("6.40"); // null treated as 0
    }

    @Test
    void getMetrics_doesNotMutateAnyExistingDataAndIsIdempotent() {
        Member member = seedMember("ada-" + UUID.randomUUID() + "@example.com");
        Cafe cafe = seedCafe("Cafe " + UUID.randomUUID(), new BigDecimal("0.8000"));
        Drink drink = seedDrink(cafe, "Drink " + UUID.randomUUID(), 4);
        Redemption redemption = seedRedemption(member, cafe, drink, 4, new BigDecimal("0.8000"), Instant.parse("2026-01-01T00:00:00Z"));
        Payout payout = seedPayout(cafe, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), new BigDecimal("3.20"), null);

        long memberCountBefore = memberRepository.count();
        long cafeCountBefore = cafeRepository.count();
        long drinkCountBefore = drinkRepository.count();
        long redemptionCountBefore = redemptionRepository.count();
        long payoutCountBefore = payoutRepository.count();

        AdminDashboardMetricsResponse first = adminDashboardService.getMetrics();
        AdminDashboardMetricsResponse second = adminDashboardService.getMetrics();

        assertThat(second).isEqualTo(first);
        assertThat(memberRepository.count()).isEqualTo(memberCountBefore);
        assertThat(cafeRepository.count()).isEqualTo(cafeCountBefore);
        assertThat(drinkRepository.count()).isEqualTo(drinkCountBefore);
        assertThat(redemptionRepository.count()).isEqualTo(redemptionCountBefore);
        assertThat(payoutRepository.count()).isEqualTo(payoutCountBefore);

        // Confirms existing payout/redemption records are byte-for-byte
        // unchanged - not just that the row count is stable.
        Redemption reloadedRedemption = redemptionRepository.findById(redemption.getId()).orElseThrow();
        assertThat(reloadedRedemption.getCreditsDeducted()).isEqualTo(4);
        assertThat(reloadedRedemption.getPayoutRate()).isEqualByComparingTo("0.8000");

        Payout reloadedPayout = payoutRepository.findById(payout.getId()).orElseThrow();
        assertThat(reloadedPayout.getAmountOwed()).isEqualByComparingTo("3.20");
        assertThat(reloadedPayout.getAmountPaid()).isNull();
    }
}
