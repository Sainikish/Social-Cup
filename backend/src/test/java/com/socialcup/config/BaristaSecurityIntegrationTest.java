package com.socialcup.config;

import com.socialcup.barista.entity.CafePin;
import com.socialcup.barista.repository.CafePinRepository;
import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.credit.repository.CreditLedgerRepository;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.rating.repository.RatingRepository;
import com.socialcup.redemption.repository.RedemptionCodeRepository;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.Roles;
import com.socialcup.user.repository.MemberRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Mirrors SecurityIntegrationTest's structure exactly, but as a separate file
// rather than an edit to it (out of scope to modify) - it independently mocks
// every repository currently in the app context, including CreditLedgerRepository
// and CafePinRepository, both added after SecurityIntegrationTest was last
// updated. Without doing so this class would inherit the same pre-existing,
// unrelated "no-persistence" wiring gap (see Phase B report) that already
// causes SecurityIntegrationTest/RateLimitIntegrationTest to fail today.
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
class BaristaSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

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

    // Added when Phase C introduced RedemptionCodeService/RedemptionCodeController
    // into the same shared app context this test boots - without this the context
    // fails to start (no bean of this type exists under "no-persistence"), exactly
    // the same class of gap CreditLedgerRepository/CafePinRepository above were
    // already added here to avoid.
    @MockitoBean
    private RedemptionCodeRepository redemptionCodeRepository;

    @Test
    void baristaLoginIsPublic_andReturnsAWorkingBaristaTokenOnSuccess() throws Exception {
        UUID cafeId = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(cafeId);
        cafe.setName("Test Cafe");
        cafe.setStatus(CafeStatus.ACTIVE);

        CafePin cafePin = new CafePin();
        cafePin.setPinHash(passwordEncoder.encode("1234"));

        when(cafeRepository.findByIdAndArchivedAtIsNull(cafeId)).thenReturn(Optional.of(cafe));
        when(cafePinRepository.findByCafeId(cafeId)).thenReturn(Optional.of(cafePin));
        when(cafePinRepository.save(any())).thenReturn(cafePin);

        String responseJson = mockMvc.perform(post("/barista/login")
                .contentType("application/json")
                .content("{\"cafeId\":\"" + cafeId + "\",\"pin\":\"1234\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.cafeId", org.hamcrest.Matchers.is(cafeId.toString())))
            .andReturn().getResponse().getContentAsString();

        String accessToken = com.jayway.jsonpath.JsonPath.read(responseJson, "$.accessToken");
        Claims claims = tokenProvider.parseClaims(accessToken).orElseThrow();
        assertThat(claims.getSubject()).isEqualTo(cafeId.toString());
        assertThat(claims.get("cafeId", String.class)).isEqualTo(cafeId.toString());
        @SuppressWarnings("unchecked")
        List<String> roles = claims.get("roles", List.class);
        assertThat(roles).containsExactly(Roles.BARISTA);
    }

    @Test
    void baristaOnlyEndpoint_rejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/test-support/protected/barista-only"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void baristaOnlyEndpoint_rejectsAMemberToken() throws Exception {
        String memberToken = tokenProvider.generateAccessToken(UUID.randomUUID().toString(), List.of(Roles.MEMBER));

        mockMvc.perform(get("/test-support/protected/barista-only")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + memberToken))
            .andExpect(status().isForbidden());
    }

    @Test
    void baristaOnlyEndpoint_acceptsABaristaToken() throws Exception {
        String baristaToken = tokenProvider.generateAccessToken(
            UUID.randomUUID().toString(), List.of(Roles.BARISTA));

        mockMvc.perform(get("/test-support/protected/barista-only")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + baristaToken))
            .andExpect(status().isOk());
    }
}
