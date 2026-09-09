package com.socialcup.redemption.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.credit.entity.CreditLedger;
import com.socialcup.credit.entity.CreditLedgerType;
import com.socialcup.credit.repository.CreditLedgerRepository;
import com.socialcup.credit.service.CreditService;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.redemption.dto.CreateRedemptionCodeRequest;
import com.socialcup.redemption.dto.RedemptionCodeResponse;
import com.socialcup.redemption.dto.RedemptionResponse;
import com.socialcup.redemption.entity.Redemption;
import com.socialcup.redemption.entity.RedemptionCode;
import com.socialcup.redemption.repository.RedemptionCodeRepository;
import com.socialcup.redemption.repository.RedemptionRepository;
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
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Real PostgreSQL via Testcontainers, same convention as
// RedemptionCodeIntegrationTest/CreditServiceConcurrencyIntegrationTest - proves
// the actual member/cafe/drink/code foreign keys, the credit ledger deduction,
// and the payout-rate snapshot against a real database, not mocked repositories.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class RedemptionIntegrationTest {

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
    void redeem_endToEnd_persistsARedemptionWithTheCorrectRelationshipsAndPayoutSnapshot_andMarksTheCodeRedeemed() {
        Member member = seedMemberWithCredits(30);
        Cafe cafe = seedCafe();
        Drink drink = seedDrink(cafe, 4);

        RedemptionCodeResponse generated = redemptionCodeService.generateCode(
            member.getId(), new CreateRedemptionCodeRequest(drink.getId()));

        RedemptionResponse response = redemptionService.redeem(cafe.getId(), generated.code());

        assertThat(response.drinkId()).isEqualTo(drink.getId());
        assertThat(response.creditsDeducted()).isEqualTo(4);

        List<Redemption> redemptions = redemptionRepository.findAll();
        assertThat(redemptions).hasSize(1);
        Redemption redemption = redemptions.get(0);
        assertThat(redemption.getMember().getId()).isEqualTo(member.getId());
        assertThat(redemption.getCafe().getId()).isEqualTo(cafe.getId());
        assertThat(redemption.getDrink().getId()).isEqualTo(drink.getId());
        assertThat(redemption.getCreditsDeducted()).isEqualTo(4);
        assertThat(redemption.getPayoutRate()).isEqualByComparingTo("0.8000");

        RedemptionCode persistedCode = redemptionCodeRepository.findByCodeValue(generated.code()).orElseThrow();
        assertThat(persistedCode.isRedeemed()).isTrue();
        assertThat(persistedCode.getRedeemedAt()).isNotNull();

        List<CreditLedger> redemptionEntries = creditLedgerRepository.findAll().stream()
            .filter(entry -> entry.getMember().getId().equals(member.getId()))
            .filter(entry -> entry.getType() == CreditLedgerType.REDEMPTION)
            .toList();
        assertThat(redemptionEntries).hasSize(1);
        assertThat(redemptionEntries.get(0).getAmount()).isEqualTo(-4);
        assertThat(creditService.getBalance(member.getId())).isEqualTo(26L);
    }

    @Test
    void redeem_payoutSnapshot_isNotAffectedByALaterChangeToTheCafesPayoutRate() {
        Member member = seedMemberWithCredits(30);
        Cafe cafe = seedCafe();
        Drink drink = seedDrink(cafe, 4);
        RedemptionCodeResponse generated = redemptionCodeService.generateCode(
            member.getId(), new CreateRedemptionCodeRequest(drink.getId()));

        redemptionService.redeem(cafe.getId(), generated.code());

        Redemption redemption = redemptionRepository.findAll().get(0);
        assertThat(redemption.getPayoutRate()).isEqualByComparingTo("0.8000");

        Cafe managedCafe = cafeRepository.findById(cafe.getId()).orElseThrow();
        managedCafe.setPayoutRate(new BigDecimal("0.5000"));
        cafeRepository.saveAndFlush(managedCafe);

        Redemption reloaded = redemptionRepository.findById(redemption.getId()).orElseThrow();
        assertThat(reloaded.getPayoutRate()).isEqualByComparingTo("0.8000");
    }

    // ---- Backup-code redemption (Phase 6G) ----

    private void forceBackupCode(String primaryCode, String backupCode) {
        RedemptionCode persisted = redemptionCodeRepository.findByCodeValue(primaryCode).orElseThrow();
        persisted.setBackupCode(backupCode);
        redemptionCodeRepository.saveAndFlush(persisted);
    }

    @Test
    void redeem_viaBackupCode_endToEnd_succeedsExactlyLikeThePrimaryCode() {
        Member member = seedMemberWithCredits(30);
        Cafe cafe = seedCafe();
        Drink drink = seedDrink(cafe, 4);
        RedemptionCodeResponse generated = redemptionCodeService.generateCode(
            member.getId(), new CreateRedemptionCodeRequest(drink.getId()));

        RedemptionResponse response = redemptionService.redeem(cafe.getId(), generated.backupCode());

        assertThat(response.drinkId()).isEqualTo(drink.getId());
        assertThat(response.creditsDeducted()).isEqualTo(4);
        RedemptionCode persistedCode = redemptionCodeRepository.findByCodeValue(generated.code()).orElseThrow();
        assertThat(persistedCode.isRedeemed()).isTrue();
    }

    @Test
    void redeem_viaBackupCode_doesNotMatchAnotherCafesLiveCodeSharingTheSameBackupValue() {
        Member memberA = seedMemberWithCredits(30);
        Member memberB = seedMemberWithCredits(30);
        Cafe cafeA = seedCafe();
        Cafe cafeB = seedCafe();
        Drink drinkA = seedDrink(cafeA, 4);
        Drink drinkB = seedDrink(cafeB, 3);

        RedemptionCodeResponse generatedA = redemptionCodeService.generateCode(
            memberA.getId(), new CreateRedemptionCodeRequest(drinkA.getId()));
        RedemptionCodeResponse generatedB = redemptionCodeService.generateCode(
            memberB.getId(), new CreateRedemptionCodeRequest(drinkB.getId()));

        // Force both live codes to share the exact same 6-digit backup value -
        // the whole point of this test, since real generation makes this
        // exceedingly unlikely to happen naturally.
        forceBackupCode(generatedA.code(), "555555");
        forceBackupCode(generatedB.code(), "555555");

        RedemptionResponse response = redemptionService.redeem(cafeA.getId(), "555555");

        assertThat(response.drinkId()).isEqualTo(drinkA.getId());
        RedemptionCode redeemedA = redemptionCodeRepository.findByCodeValue(generatedA.code()).orElseThrow();
        assertThat(redeemedA.isRedeemed()).isTrue();
        // Cafe B's identically-coded live redemption is completely unaffected -
        // the query scoped to cafeA never even considered it.
        RedemptionCode untouchedB = redemptionCodeRepository.findByCodeValue(generatedB.code()).orElseThrow();
        assertThat(untouchedB.isRedeemed()).isFalse();
    }

    @Test
    void redeem_viaBackupCode_ambiguousCollisionAtTheSameCafe_refusesToGuess_throwsResourceNotFound() {
        Member memberA = seedMemberWithCredits(30);
        Member memberB = seedMemberWithCredits(30);
        Cafe cafe = seedCafe();
        Drink drink = seedDrink(cafe, 4);

        RedemptionCodeResponse generatedA = redemptionCodeService.generateCode(
            memberA.getId(), new CreateRedemptionCodeRequest(drink.getId()));
        RedemptionCodeResponse generatedB = redemptionCodeService.generateCode(
            memberB.getId(), new CreateRedemptionCodeRequest(drink.getId()));

        forceBackupCode(generatedA.code(), "555555");
        forceBackupCode(generatedB.code(), "555555");

        assertThatThrownBy(() -> redemptionService.redeem(cafe.getId(), "555555"))
            .isInstanceOf(ResourceNotFoundException.class);

        RedemptionCode untouchedA = redemptionCodeRepository.findByCodeValue(generatedA.code()).orElseThrow();
        RedemptionCode untouchedB = redemptionCodeRepository.findByCodeValue(generatedB.code()).orElseThrow();
        assertThat(untouchedA.isRedeemed()).isFalse();
        assertThat(untouchedB.isRedeemed()).isFalse();
    }

    @Test
    void redeem_viaBackupCode_doesNotMatchAStaleAlreadyRedeemedCodeSharingTheSameBackupValue() {
        Member memberA = seedMemberWithCredits(30);
        Member memberB = seedMemberWithCredits(30);
        Cafe cafe = seedCafe();
        Drink drink = seedDrink(cafe, 4);

        RedemptionCodeResponse generatedA = redemptionCodeService.generateCode(
            memberA.getId(), new CreateRedemptionCodeRequest(drink.getId()));
        forceBackupCode(generatedA.code(), "555555");
        redemptionService.redeem(cafe.getId(), generatedA.code());

        // A brand-new, unrelated live code happens to draw the same backup
        // value the now-consumed code above used.
        RedemptionCodeResponse generatedB = redemptionCodeService.generateCode(
            memberB.getId(), new CreateRedemptionCodeRequest(drink.getId()));
        forceBackupCode(generatedB.code(), "555555");

        RedemptionResponse response = redemptionService.redeem(cafe.getId(), "555555");

        assertThat(response.memberFirstName()).isEqualTo(memberB.getFirstName());
    }
}
