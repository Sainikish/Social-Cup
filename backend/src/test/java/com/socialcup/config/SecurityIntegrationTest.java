package com.socialcup.config;

import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.Roles;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.rating.repository.RatingRepository;
import com.socialcup.user.repository.MemberRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// No JPA entities exist yet, so this test excludes datasource/JPA/Flyway
// autoconfiguration and activates "no-persistence" (see JpaConfig) rather than
// requiring a live database to verify security wiring.
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "spring.autoconfigure.exclude="
        + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
        + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
        + "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration,"
        + "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration"
)
@ActiveProfiles({"test", "no-persistence"})
@AutoConfigureMockMvc
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private MemberRepository memberRepository;

    @MockitoBean
    private CafeRepository cafeRepository;

    @MockitoBean
    private DrinkRepository drinkRepository;

    @MockitoBean
    private RatingRepository ratingRepository;

    @Test
    void publicEndpointIsAccessibleWithoutAToken() throws Exception {
        mockMvc.perform(get("/health"))
            .andExpect(status().isOk());
    }

    @Test
    void protectedEndpointRejectsRequestWithoutToken() throws Exception {
        mockMvc.perform(get("/test-support/protected/ping"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status", is(401)))
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }

    @Test
    void protectedEndpointAcceptsAValidAccessToken() throws Exception {
        String token = tokenProvider.generateAccessToken("member-42", List.of(Roles.MEMBER));

        mockMvc.perform(get("/test-support/protected/ping")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.principal", is("member-42")))
            .andExpect(jsonPath("$.authorities[0]", is("ROLE_" + Roles.MEMBER)));
    }

    @Test
    void protectedEndpointRejectsMalformedToken() throws Exception {
        mockMvc.perform(get("/test-support/protected/ping")
                .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-real-token"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpointRejectsARefreshTokenUsedAsAnAccessToken() throws Exception {
        String refreshToken = tokenProvider.generateRefreshToken("member-42");

        mockMvc.perform(get("/test-support/protected/ping")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + refreshToken))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void roleGatedEndpointRejectsAnAuthenticatedUserLackingTheRole() throws Exception {
        String token = tokenProvider.generateAccessToken("member-42", List.of(Roles.MEMBER));

        mockMvc.perform(get("/test-support/protected/admin-only")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status", is(403)))
            .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
    }

    @Test
    void roleGatedEndpointAcceptsAUserWithTheRequiredRole() throws Exception {
        String token = tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));

        mockMvc.perform(get("/test-support/protected/admin-only")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void corsPreflightForAllowedOriginSucceeds() throws Exception {
        mockMvc.perform(options("/health")
                .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                .header("Access-Control-Request-Method", HttpMethod.GET.name()))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"));
    }

    @Test
    void everyResponseCarriesARequestIdHeader() throws Exception {
        mockMvc.perform(get("/health"))
            .andExpect(header().exists("X-Request-Id"));
    }

    @Test
    void livenessProbeIsAccessible() throws Exception {
        mockMvc.perform(get("/actuator/health/liveness"))
            .andExpect(status().isOk());
    }

    @Test
    void readinessProbeIsAccessible() throws Exception {
        mockMvc.perform(get("/actuator/health/readiness"))
            .andExpect(status().isOk());
    }

}
