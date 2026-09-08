package com.socialcup.redemption.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.credit.entity.CreditLedger;
import com.socialcup.credit.entity.CreditLedgerType;
import com.socialcup.credit.repository.CreditLedgerRepository;
import com.socialcup.credit.service.CreditService;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.redemption.dto.CreateRedemptionCodeRequest;
import com.socialcup.redemption.dto.RedemptionCodeResponse;
import com.socialcup.redemption.dto.RedemptionResponse;
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

import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;

// Proves the PESSIMISTIC_WRITE lock on redemption_code actually prevents a
// double-redemption, against a REAL PostgreSQL instance with two genuinely
// concurrent, independently-committing transactions on separate threads - same
// convention as CreditServiceConcurrencyIntegrationTest. Deliberately NOT
// annotated @Transactional at the class/method level: doing so would wrap the
// whole test (and the "concurrent" calls inside it) in one outer transaction,
// defeating the entire point of the test.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class RedemptionConcurrencyIntegrationTest {

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

    @Test
    void twoConcurrentRedemptionsOfTheSameCode_exactlyOneSucceeds_andTheCodeIsNeverDoubleRedeemed() throws Exception {
        Member member = new Member();
        member.setEmail("ada-" + UUID.randomUUID() + "@example.com");
        member.setFirstName("Ada");
        member = memberRepository.saveAndFlush(member);
        creditService.grantMonthlyCredits(member.getId(), "test-seed");

        Cafe cafe = new Cafe();
        cafe.setName("Blue Bottle Coffee " + UUID.randomUUID());
        cafe.setAddress("300 Main St");
        cafe = cafeRepository.saveAndFlush(cafe);

        Drink drink = new Drink();
        drink.setCafe(cafe);
        drink.setName("Oat Milk Latte " + UUID.randomUUID());
        drink.setCreditPrice(4);
        drink = drinkRepository.saveAndFlush(drink);

        RedemptionCodeResponse generated = redemptionCodeService.generateCode(
            member.getId(), new CreateRedemptionCodeRequest(drink.getId()));

        UUID cafeId = cafe.getId();
        String code = generated.code();

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Callable<RedemptionResponse> redeemAttempt = () -> redemptionService.redeem(cafeId, code);

            // invokeAll submits both tasks together and blocks until both have run
            // to completion - the two redeem(...) calls execute on separate
            // threads, each through Spring's real transactional proxy, so the
            // PESSIMISTIC_WRITE lock on the redemption_code row is genuinely
            // contended, exactly like CreditServiceConcurrencyIntegrationTest's
            // member-row lock.
            List<Future<RedemptionResponse>> results = executor.invokeAll(List.of(redeemAttempt, redeemAttempt));

            int succeeded = 0;
            int rejectedAsAlreadyRedeemed = 0;
            for (Future<RedemptionResponse> result : results) {
                try {
                    result.get(30, TimeUnit.SECONDS);
                    succeeded++;
                } catch (ExecutionException e) {
                    if (e.getCause() instanceof ConflictException) {
                        rejectedAsAlreadyRedeemed++;
                    } else {
                        throw new AssertionError("Unexpected failure from a concurrent redemption", e.getCause());
                    }
                } catch (TimeoutException e) {
                    throw new AssertionError("Redemption did not complete in time - possible deadlock", e);
                }
            }

            assertThat(succeeded).isEqualTo(1);
            assertThat(rejectedAsAlreadyRedeemed).isEqualTo(1);

            assertThat(redemptionRepository.count()).isEqualTo(1);

            RedemptionCode persistedCode = redemptionCodeRepository.findByCodeValue(code).orElseThrow();
            assertThat(persistedCode.isRedeemed()).isTrue();
            assertThat(persistedCode.getRedeemedAt()).isNotNull();

            UUID memberId = member.getId();
            List<CreditLedger> redemptionEntries = creditLedgerRepository.findAll().stream()
                .filter(entry -> entry.getMember().getId().equals(memberId))
                .filter(entry -> entry.getType() == CreditLedgerType.REDEMPTION)
                .toList();
            assertThat(redemptionEntries).hasSize(1);

            assertThat(creditService.getBalance(memberId)).isEqualTo(26L);
        } finally {
            executor.shutdownNow();
        }
    }
}
