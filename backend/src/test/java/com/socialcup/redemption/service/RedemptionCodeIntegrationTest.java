package com.socialcup.redemption.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.credit.service.CreditService;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.redemption.dto.CreateRedemptionCodeRequest;
import com.socialcup.redemption.dto.RedemptionCodeResponse;
import com.socialcup.redemption.entity.RedemptionCode;
import com.socialcup.redemption.repository.RedemptionCodeRepository;
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

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// Real PostgreSQL via Testcontainers, same convention as
// CreditServiceConcurrencyIntegrationTest/CafeDrinkUniquenessConstraintIntegrationTest -
// proves the actual member/cafe/drink foreign keys and valid_until timing against a
// real database, not mocked repositories. Deliberately does not exercise
// redeemed=true for a historical code: setting that column is Phase D's atomic
// redemption transaction, which does not exist yet (see Phase C instructions).
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class RedemptionCodeIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private RedemptionCodeService redemptionCodeService;

    @Autowired
    private RedemptionCodeRepository redemptionCodeRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private CafeRepository cafeRepository;

    @Autowired
    private DrinkRepository drinkRepository;

    @Autowired
    private CreditService creditService;

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

    @Test
    void generateCode_persistsACodeWithTheCorrectMemberCafeDrinkAndFiveMinuteValidity() {
        Member member = seedMemberWithCredits(30);
        Cafe cafe = seedCafe();
        Drink drink = seedDrink(cafe, 4);

        Instant before = Instant.now();
        RedemptionCodeResponse response = redemptionCodeService.generateCode(
            member.getId(), new CreateRedemptionCodeRequest(drink.getId()));
        Instant after = Instant.now();

        RedemptionCode saved = redemptionCodeRepository.findByCodeValue(response.code()).orElseThrow();
        assertThat(saved.getMember().getId()).isEqualTo(member.getId());
        assertThat(saved.getCafe().getId()).isEqualTo(cafe.getId());
        assertThat(saved.getDrink().getId()).isEqualTo(drink.getId());
        assertThat(saved.isRedeemed()).isFalse();
        assertThat(saved.getRedeemedAt()).isNull();
        assertThat(saved.getValidUntil())
            .isAfterOrEqualTo(before.plus(Duration.ofMinutes(5)).minusSeconds(5))
            .isBeforeOrEqualTo(after.plus(Duration.ofMinutes(5)).plusSeconds(5));
    }

    @Test
    void generateCode_aSecondTime_invalidatesTheFirstCode_whileTheSecondRemainsLive() {
        Member member = seedMemberWithCredits(30);
        Cafe cafe = seedCafe();
        Drink drink = seedDrink(cafe, 4);
        CreateRedemptionCodeRequest request = new CreateRedemptionCodeRequest(drink.getId());

        RedemptionCodeResponse first = redemptionCodeService.generateCode(member.getId(), request);
        RedemptionCodeResponse second = redemptionCodeService.generateCode(member.getId(), request);

        RedemptionCode firstEntity = redemptionCodeRepository.findByCodeValue(first.code()).orElseThrow();
        RedemptionCode secondEntity = redemptionCodeRepository.findByCodeValue(second.code()).orElseThrow();

        assertThat(firstEntity.isLive()).isFalse();
        assertThat(firstEntity.isRedeemed()).isFalse();
        assertThat(secondEntity.isLive()).isTrue();
        assertThat(firstEntity.getCodeValue()).isNotEqualTo(secondEntity.getCodeValue());
    }
}
