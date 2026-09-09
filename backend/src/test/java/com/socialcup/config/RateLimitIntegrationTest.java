package com.socialcup.config;

import com.socialcup.admin.repository.AuditLogRepository;
import com.socialcup.barista.repository.CafePinRepository;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.credit.repository.CreditLedgerRepository;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.payout.repository.PayoutRepository;
import com.socialcup.rating.repository.RatingRepository;
import com.socialcup.redemption.repository.RedemptionCodeRepository;
import com.socialcup.redemption.repository.RedemptionRepository;
import com.socialcup.subscription.repository.ProcessedWebhookEventRepository;
import com.socialcup.subscription.repository.SubscriptionRepository;
import com.socialcup.user.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Excludes datasource/JPA/Flyway autoconfiguration rather than requiring a
// live database to verify rate limiting. Phase 6F: this mock list had
// drifted stale since Phase C (RedemptionCode) - every @Service in the full
// app context is eagerly instantiated here, so it needs a @MockitoBean for
// every JpaRepository any of them depends on, not just the four still
// listed below from an earlier phase. Mirrors
// BaristaSecurityIntegrationTest's own (already correct, already complete)
// mock list exactly.
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "app.rate-limit.max-requests=2",
        "app.rate-limit.window-seconds=45",
        "spring.autoconfigure.exclude="
            + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
            + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
            + "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration,"
            + "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration"
    }
)
@ActiveProfiles({"test", "no-persistence"})
@AutoConfigureMockMvc
class RateLimitIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MemberRepository memberRepository;

    @MockitoBean
    private CafeRepository cafeRepository;

    @MockitoBean
    private DrinkRepository drinkRepository;

    @MockitoBean
    private RatingRepository ratingRepository;

    @MockitoBean
    private CreditLedgerRepository creditLedgerRepository;

    @MockitoBean
    private CafePinRepository cafePinRepository;

    @MockitoBean
    private RedemptionCodeRepository redemptionCodeRepository;

    @MockitoBean
    private RedemptionRepository redemptionRepository;

    @MockitoBean
    private SubscriptionRepository subscriptionRepository;

    @MockitoBean
    private ProcessedWebhookEventRepository processedWebhookEventRepository;

    @MockitoBean
    private AuditLogRepository auditLogRepository;

    @MockitoBean
    private PayoutRepository payoutRepository;

    @Test
    void requestsBeyondTheLimitReceive429() throws Exception {
        mockMvc.perform(get("/health")).andExpect(status().isOk());
        mockMvc.perform(get("/health")).andExpect(status().isOk());

        mockMvc.perform(get("/health"))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.code", is("RATE_LIMIT_EXCEEDED")))
            .andExpect(header().string("Retry-After", "45"));
    }

}
