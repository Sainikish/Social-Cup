package com.socialcup.redemption.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.dto.PageResponse;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.redemption.dto.AdminRedemptionResponse;
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
import org.springframework.data.domain.PageRequest;
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

// Real PostgreSQL via Testcontainers, same convention as RedemptionIntegrationTest -
// proves the Specification-based query in RedemptionSpecifications.forAdmin
// (used via RedemptionRepository's JpaSpecificationExecutor) actually executes,
// fetch-joins, filters, and paginates correctly against a real database, not
// mocked repositories. Redemption rows are persisted directly (not via
// RedemptionService.redeem()) so createdAt can be controlled precisely for the
// from/to range assertions below - redeem() always stamps "now" via @PrePersist.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class AdminRedemptionIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private RedemptionService redemptionService;

    @Autowired
    private RedemptionRepository redemptionRepository;

    @Autowired
    private RedemptionCodeRepository redemptionCodeRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private CafeRepository cafeRepository;

    @Autowired
    private DrinkRepository drinkRepository;

    // Every test in this class asserts on getTotalElements()/getContent() over
    // the WHOLE table (unlike RedemptionIntegrationTest, which only ever looks
    // up its own newly-created rows by id) - this class shares one Postgres
    // container across all its @Test methods, so without this cleanup, rows
    // committed by an earlier method would leak into a later method's count.
    // Deleted in FK-safe order: redemption references redemption_code, which
    // (with drink) references cafe.
    @BeforeEach
    void cleanDatabase() {
        redemptionRepository.deleteAllInBatch();
        redemptionCodeRepository.deleteAllInBatch();
        drinkRepository.deleteAllInBatch();
        cafeRepository.deleteAllInBatch();
        memberRepository.deleteAllInBatch();
    }

    private Member seedMember(String email) {
        Member member = new Member();
        member.setEmail(email);
        member.setFirstName("Ada");
        return memberRepository.saveAndFlush(member);
    }

    private Cafe seedCafe(String name) {
        Cafe cafe = new Cafe();
        cafe.setName(name);
        cafe.setAddress("300 Main St");
        cafe.setPayoutRate(new BigDecimal("0.8000"));
        return cafeRepository.saveAndFlush(cafe);
    }

    private Drink seedDrink(Cafe cafe, String name) {
        Drink drink = new Drink();
        drink.setCafe(cafe);
        drink.setName(name);
        drink.setCreditPrice(4);
        return drinkRepository.saveAndFlush(drink);
    }

    private Redemption seedRedemption(Member member, Cafe cafe, Drink drink, Instant createdAt) {
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
        redemption.setCreditsDeducted(drink.getCreditPrice());
        redemption.setPayoutRate(cafe.getPayoutRate());
        redemption.setCreatedAt(createdAt);
        return redemptionRepository.saveAndFlush(redemption);
    }

    @Test
    void getRedemptionsForAdmin_noFilters_returnsAllRedemptionsWithJoinedFields() {
        Member member = seedMember("ada-" + UUID.randomUUID() + "@example.com");
        Cafe cafe = seedCafe("Blue Bottle Coffee " + UUID.randomUUID());
        Drink drink = seedDrink(cafe, "Oat Milk Latte " + UUID.randomUUID());
        Redemption redemption = seedRedemption(member, cafe, drink, Instant.parse("2026-01-15T10:00:00Z"));

        PageResponse<AdminRedemptionResponse> page = redemptionService.getRedemptionsForAdmin(
            null, null, null, null, null, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(1);
        AdminRedemptionResponse response = page.getContent().get(0);
        assertThat(response.redemptionId()).isEqualTo(redemption.getId());
        assertThat(response.memberId()).isEqualTo(member.getId());
        assertThat(response.memberEmail()).isEqualTo(member.getEmail());
        assertThat(response.cafeId()).isEqualTo(cafe.getId());
        assertThat(response.cafeName()).isEqualTo(cafe.getName());
        assertThat(response.drinkId()).isEqualTo(drink.getId());
        assertThat(response.drinkName()).isEqualTo(drink.getName());
        assertThat(response.creditsDeducted()).isEqualTo(4);
        assertThat(response.payoutRate()).isEqualByComparingTo("0.8000");
        assertThat(response.createdAt()).isEqualTo(Instant.parse("2026-01-15T10:00:00Z"));
    }

    @Test
    void getRedemptionsForAdmin_emptyDatabase_returnsEmptyPage() {
        PageResponse<AdminRedemptionResponse> page = redemptionService.getRedemptionsForAdmin(
            UUID.randomUUID(), null, null, null, null, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isZero();
        assertThat(page.isEmpty()).isTrue();
        assertThat(page.getContent()).isEmpty();
    }

    @Test
    void getRedemptionsForAdmin_cafeIdFilter_returnsOnlyThatCafesRedemptions() {
        Member member = seedMember("ada-" + UUID.randomUUID() + "@example.com");
        Cafe cafeA = seedCafe("Cafe A " + UUID.randomUUID());
        Cafe cafeB = seedCafe("Cafe B " + UUID.randomUUID());
        Drink drinkA = seedDrink(cafeA, "Drink A " + UUID.randomUUID());
        Drink drinkB = seedDrink(cafeB, "Drink B " + UUID.randomUUID());
        seedRedemption(member, cafeA, drinkA, Instant.parse("2026-01-10T00:00:00Z"));
        seedRedemption(member, cafeB, drinkB, Instant.parse("2026-01-11T00:00:00Z"));

        PageResponse<AdminRedemptionResponse> page = redemptionService.getRedemptionsForAdmin(
            cafeA.getId(), null, null, null, null, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).cafeId()).isEqualTo(cafeA.getId());
    }

    @Test
    void getRedemptionsForAdmin_memberIdFilter_returnsOnlyThatMembersRedemptions() {
        Member memberA = seedMember("a-" + UUID.randomUUID() + "@example.com");
        Member memberB = seedMember("b-" + UUID.randomUUID() + "@example.com");
        Cafe cafe = seedCafe("Cafe " + UUID.randomUUID());
        Drink drink = seedDrink(cafe, "Drink " + UUID.randomUUID());
        seedRedemption(memberA, cafe, drink, Instant.parse("2026-01-10T00:00:00Z"));
        seedRedemption(memberB, cafe, drink, Instant.parse("2026-01-11T00:00:00Z"));

        PageResponse<AdminRedemptionResponse> page = redemptionService.getRedemptionsForAdmin(
            null, memberA.getId(), null, null, null, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).memberId()).isEqualTo(memberA.getId());
    }

    @Test
    void getRedemptionsForAdmin_drinkIdFilter_returnsOnlyThatDrinksRedemptions() {
        Member member = seedMember("ada-" + UUID.randomUUID() + "@example.com");
        Cafe cafe = seedCafe("Cafe " + UUID.randomUUID());
        Drink drinkA = seedDrink(cafe, "Drink A " + UUID.randomUUID());
        Drink drinkB = seedDrink(cafe, "Drink B " + UUID.randomUUID());
        seedRedemption(member, cafe, drinkA, Instant.parse("2026-01-10T00:00:00Z"));
        seedRedemption(member, cafe, drinkB, Instant.parse("2026-01-11T00:00:00Z"));

        PageResponse<AdminRedemptionResponse> page = redemptionService.getRedemptionsForAdmin(
            null, null, drinkA.getId(), null, null, PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).drinkId()).isEqualTo(drinkA.getId());
    }

    @Test
    void getRedemptionsForAdmin_fromAndToFilters_areInclusiveOfFromAndInclusiveOfWholeToDay() {
        Member member = seedMember("ada-" + UUID.randomUUID() + "@example.com");
        Cafe cafe = seedCafe("Cafe " + UUID.randomUUID());
        Drink drink = seedDrink(cafe, "Drink " + UUID.randomUUID());
        seedRedemption(member, cafe, drink, Instant.parse("2025-12-31T23:59:59Z")); // before range
        Redemption inRangeStart = seedRedemption(member, cafe, drink, Instant.parse("2026-01-01T00:00:00Z")); // start of range
        Redemption inRangeEnd = seedRedemption(member, cafe, drink, Instant.parse("2026-01-31T23:59:59Z")); // end of range
        seedRedemption(member, cafe, drink, Instant.parse("2026-02-01T00:00:00Z")); // after range (exclusive)

        PageResponse<AdminRedemptionResponse> page = redemptionService.getRedemptionsForAdmin(
            null, null, null, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), PageRequest.of(0, 20));

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent())
            .extracting(AdminRedemptionResponse::redemptionId)
            .containsExactlyInAnyOrder(inRangeStart.getId(), inRangeEnd.getId());
    }

    @Test
    void getRedemptionsForAdmin_pagination_splitsAcrossPagesInDescendingCreatedAtOrder() {
        Member member = seedMember("ada-" + UUID.randomUUID() + "@example.com");
        Cafe cafe = seedCafe("Cafe " + UUID.randomUUID());
        Drink drink = seedDrink(cafe, "Drink " + UUID.randomUUID());
        Redemption first = seedRedemption(member, cafe, drink, Instant.parse("2026-01-01T00:00:00Z"));
        Redemption second = seedRedemption(member, cafe, drink, Instant.parse("2026-01-02T00:00:00Z"));
        Redemption third = seedRedemption(member, cafe, drink, Instant.parse("2026-01-03T00:00:00Z"));

        PageResponse<AdminRedemptionResponse> firstPage = redemptionService.getRedemptionsForAdmin(
            null, null, null, null, null,
            PageRequest.of(0, 2, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")));

        assertThat(firstPage.getTotalElements()).isEqualTo(3);
        assertThat(firstPage.getTotalPages()).isEqualTo(2);
        assertThat(firstPage.isFirst()).isTrue();
        assertThat(firstPage.isLast()).isFalse();
        assertThat(firstPage.getContent()).extracting(AdminRedemptionResponse::redemptionId)
            .containsExactly(third.getId(), second.getId());

        PageResponse<AdminRedemptionResponse> secondPage = redemptionService.getRedemptionsForAdmin(
            null, null, null, null, null,
            PageRequest.of(1, 2, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")));

        assertThat(secondPage.isLast()).isTrue();
        assertThat(secondPage.getContent()).extracting(AdminRedemptionResponse::redemptionId)
            .containsExactly(first.getId());
    }
}
