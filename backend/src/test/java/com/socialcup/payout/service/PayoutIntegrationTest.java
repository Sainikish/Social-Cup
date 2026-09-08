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
}
