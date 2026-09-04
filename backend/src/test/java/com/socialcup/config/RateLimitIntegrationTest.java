package com.socialcup.config;

import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.rating.repository.RatingRepository;
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

// No JPA entities exist yet, so this test excludes datasource/JPA/Flyway
// autoconfiguration rather than requiring a live database to verify rate limiting.
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
