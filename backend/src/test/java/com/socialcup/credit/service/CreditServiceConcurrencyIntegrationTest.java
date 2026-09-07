package com.socialcup.credit.service;

import com.socialcup.credit.entity.CreditLedger;
import com.socialcup.credit.entity.CreditLedgerType;
import com.socialcup.credit.exception.InsufficientCreditsException;
import com.socialcup.credit.repository.CreditLedgerRepository;
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

// Proves the approved pessimistic-lock strategy actually prevents a
// double-spend, against a REAL PostgreSQL instance with two genuinely
// concurrent, independently-committing transactions on separate threads -
// not a single test transaction, not a mocked ordering assumption. This is
// deliberately NOT annotated @Transactional at the class/method level: doing
// so would wrap the whole test (and the "concurrent" calls inside it) in one
// outer transaction, defeating the entire point of the test.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class CreditServiceConcurrencyIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private CreditService creditService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private CreditLedgerRepository creditLedgerRepository;

    @Test
    void twoConcurrentDeductionsForTheSameMember_exactlyOneSucceeds_andTheLedgerNeverDoubleSpends() throws Exception {
        Member member = newMember("ada-" + UUID.randomUUID() + "@example.com");
        member = memberRepository.saveAndFlush(member);
        UUID memberId = member.getId();

        // Seed an initial balance of 10 credits directly via the ledger -
        // the scenario this test is required to prove: two concurrent
        // attempts to each deduct 10 must not both succeed.
        CreditLedger initialGrant = new CreditLedger();
        initialGrant.setMember(member);
        initialGrant.setAmount(10);
        initialGrant.setType(CreditLedgerType.MONTHLY_GRANT);
        initialGrant.setReference("test-seed");
        creditLedgerRepository.saveAndFlush(initialGrant);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Callable<CreditLedger> deduction = () -> creditService.deductForRedemption(memberId, 10, "concurrent-test");

            // invokeAll submits both tasks to the pool together and blocks
            // until both have run to completion - the two deductForRedemption
            // calls execute on separate threads, each acquiring its own
            // transaction/connection via the real Spring proxy, so the
            // pessimistic lock on the member row is genuinely contended.
            List<Future<CreditLedger>> results = executor.invokeAll(List.of(deduction, deduction));

            int succeeded = 0;
            int rejectedForInsufficientCredits = 0;
            for (Future<CreditLedger> result : results) {
                try {
                    result.get(30, TimeUnit.SECONDS);
                    succeeded++;
                } catch (ExecutionException e) {
                    if (e.getCause() instanceof InsufficientCreditsException) {
                        rejectedForInsufficientCredits++;
                    } else {
                        throw new AssertionError("Unexpected failure from a concurrent deduction", e.getCause());
                    }
                } catch (TimeoutException e) {
                    throw new AssertionError("Deduction did not complete in time - possible deadlock", e);
                }
            }

            assertThat(succeeded).isEqualTo(1);
            assertThat(rejectedForInsufficientCredits).isEqualTo(1);
            assertThat(creditService.getBalance(memberId)).isZero();

            long redemptionEntries = creditLedgerRepository.findAll().stream()
                .filter(entry -> entry.getMember().getId().equals(memberId))
                .filter(entry -> entry.getType() == CreditLedgerType.REDEMPTION)
                .count();
            assertThat(redemptionEntries).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    private static Member newMember(String email) {
        Member member = new Member();
        member.setEmail(email);
        member.setFirstName("Ada");
        return member;
    }
}
