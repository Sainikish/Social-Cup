package com.socialcup.auth.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.credit.entity.CreditLedgerType;
import com.socialcup.credit.repository.CreditLedgerRepository;
import com.socialcup.credit.service.CreditService;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.redemption.dto.CreateRedemptionCodeRequest;
import com.socialcup.redemption.dto.RedemptionCodeResponse;
import com.socialcup.redemption.dto.RedemptionResponse;
import com.socialcup.redemption.repository.RedemptionRepository;
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

import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;

// Real PostgreSQL via Testcontainers, same convention as
// RedemptionConcurrencyIntegrationTest - proves the PESSIMISTIC_WRITE lock
// MemberRepository.findByIdAndDeletedAtIsNullForUpdate already provides
// genuinely serializes account deletion against a concurrent redemption on
// the SAME member, with two independently-committing transactions on
// separate threads. Deliberately NOT annotated @Transactional at the
// class/method level, for the same reason as that test.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class AuthServiceDeleteAccountConcurrencyIntegrationTest {

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

    // Unlike RedemptionConcurrencyIntegrationTest's two identical redeem()
    // calls, these two operations are NOT symmetric: either legitimate
    // ordering (redemption commits before deletion's lock attempt, or
    // deletion commits first) is a valid outcome, not a race to be "won" by
    // one specific side. What must hold regardless of ordering is: account
    // deletion always eventually succeeds (this member has no subscription,
    // so cancelImmediatelyForAccountDeletion is a no-op and cannot itself
    // fail), and the redemption either fully committed (a redemption row AND
    // its matching credit deduction both exist) or was cleanly rejected
    // (neither exists) - never one without the other.
    @Test
    void concurrentAccountDeletionAndRedemption_serializeCleanly_neverALeaveAPartialState() throws Exception {
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

        UUID memberId = member.getId();
        UUID cafeId = cafe.getId();
        String code = generated.code();

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Callable<Boolean> deleteAttempt = () -> {
                authService.deleteAccount(memberId);
                return true;
            };
            Callable<RedemptionResponse> redeemAttempt = () -> redemptionService.redeem(cafeId, code);

            Future<Boolean> deleteFuture = executor.submit(deleteAttempt);
            Future<RedemptionResponse> redeemFuture = executor.submit(redeemAttempt);

            // Deletion has nothing that can legitimately fail here (no
            // subscription exists) - it must succeed no matter which
            // transaction reaches the member-row lock first.
            try {
                deleteFuture.get(30, TimeUnit.SECONDS);
            } catch (TimeoutException e) {
                throw new AssertionError("Account deletion did not complete in time - possible deadlock", e);
            }

            boolean redemptionSucceeded;
            try {
                redeemFuture.get(30, TimeUnit.SECONDS);
                redemptionSucceeded = true;
            } catch (TimeoutException e) {
                throw new AssertionError("Redemption did not complete in time - possible deadlock", e);
            } catch (ExecutionException e) {
                if (e.getCause() instanceof ResourceNotFoundException) {
                    redemptionSucceeded = false;
                } else {
                    throw new AssertionError("Unexpected failure from the concurrent redemption", e.getCause());
                }
            }

            Member afterDeletion = memberRepository.findById(memberId).orElseThrow();
            assertThat(afterDeletion.getDeletedAt()).isNotNull();

            long redemptionCount = redemptionRepository.count();
            long redemptionCreditDeductions = creditLedgerRepository.findAll().stream()
                .filter(entry -> entry.getMember().getId().equals(memberId))
                .filter(entry -> entry.getType() == CreditLedgerType.REDEMPTION)
                .count();

            if (redemptionSucceeded) {
                assertThat(redemptionCount).isEqualTo(1);
                assertThat(redemptionCreditDeductions).isEqualTo(1);
            } else {
                assertThat(redemptionCount).isZero();
                assertThat(redemptionCreditDeductions).isZero();
            }
            // Never a partial state either way - a redemption row without its
            // matching credit deduction, or vice versa.
            assertThat(redemptionCount).isEqualTo(redemptionCreditDeductions);
        } finally {
            executor.shutdownNow();
        }
    }
}
