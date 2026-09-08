package com.socialcup.config;

import com.jayway.jsonpath.JsonPath;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.user.entity.Member;
import com.socialcup.user.entity.MemberRole;
import com.socialcup.user.entity.MemberStatus;
import com.socialcup.user.repository.MemberRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Real PostgreSQL via Testcontainers (mirrors AdminMemberIntegrationTest)
// PLUS the full HTTP stack via MockMvc (mirrors SecurityIntegrationTest /
// BaristaSecurityIntegrationTest) - unlike either existing pattern alone,
// this is the one place that proves the JWT role claim actually comes from
// a genuinely persisted Member.role, all the way through POST /auth/login
// and POST /auth/refresh, into a real /admin/** authorization decision made
// by the real, unmodified SecurityConfig - not a hand-crafted token, and not
// a mocked repository standing in for the database.
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AdminAuthenticationSecurityIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    private static final String PASSWORD = "correct-horse-battery-staple";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    private Member createMember(MemberRole role) {
        Member member = new Member();
        member.setEmail("member-" + UUID.randomUUID() + "@example.com");
        member.setPasswordHash(passwordEncoder.encode(PASSWORD));
        member.setStatus(MemberStatus.ACTIVE);
        member.setRole(role);
        return memberRepository.saveAndFlush(member);
    }

    private String login(Member member) throws Exception {
        String responseJson = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + member.getEmail() + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return JsonPath.read(responseJson, "$.accessToken");
    }

    @SuppressWarnings("unchecked")
    private List<String> rolesInToken(String accessToken) {
        Claims claims = tokenProvider.parseClaims(accessToken).orElseThrow();
        return claims.get("roles", List.class);
    }

    @Test
    void adminLogin_producesAdminRoleToken_andCanAccessARealAdminEndpoint() throws Exception {
        Member admin = createMember(MemberRole.ADMIN);
        Member target = createMember(MemberRole.MEMBER);

        String accessToken = login(admin);

        assertThat(rolesInToken(accessToken)).containsExactly("ADMIN");

        mockMvc.perform(post("/admin/members/" + target.getId() + "/suspend")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status", is("SUSPENDED")));
    }

    @Test
    void memberLogin_producesMemberRoleToken_andIsForbiddenFromARealAdminEndpoint() throws Exception {
        Member member = createMember(MemberRole.MEMBER);
        Member target = createMember(MemberRole.MEMBER);

        String accessToken = login(member);

        assertThat(rolesInToken(accessToken)).containsExactly("MEMBER");

        mockMvc.perform(post("/admin/members/" + target.getId() + "/suspend")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status", is(403)))
            .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
    }

    @Test
    void anonymousRequest_toARealAdminEndpoint_returns401() throws Exception {
        Member target = createMember(MemberRole.MEMBER);

        mockMvc.perform(post("/admin/members/" + target.getId() + "/suspend"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status", is(401)))
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }

    @Test
    void invalidToken_toARealAdminEndpoint_isRejected() throws Exception {
        Member target = createMember(MemberRole.MEMBER);

        mockMvc.perform(post("/admin/members/" + target.getId() + "/suspend")
                .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-real-token"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void adminRefresh_rederivesAdminRoleFromThePersistedMember_notFromTheOldToken() throws Exception {
        Member admin = createMember(MemberRole.ADMIN);
        Member target = createMember(MemberRole.MEMBER);

        String loginResponseJson = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + admin.getEmail() + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        String refreshToken = JsonPath.read(loginResponseJson, "$.refreshToken");

        String refreshResponseJson = mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        String newAccessToken = JsonPath.read(refreshResponseJson, "$.accessToken");

        assertThat(rolesInToken(newAccessToken)).containsExactly("ADMIN");

        mockMvc.perform(post("/admin/members/" + target.getId() + "/suspend")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + newAccessToken))
            .andExpect(status().isOk());
    }

    @Test
    void memberRefresh_stillProducesMemberRoleToken() throws Exception {
        Member member = createMember(MemberRole.MEMBER);

        String loginResponseJson = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + member.getEmail() + "\",\"password\":\"" + PASSWORD + "\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        String refreshToken = JsonPath.read(loginResponseJson, "$.refreshToken");

        String refreshResponseJson = mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        String newAccessToken = JsonPath.read(refreshResponseJson, "$.accessToken");

        assertThat(rolesInToken(newAccessToken)).containsExactly("MEMBER");
    }

    @Test
    void adminAuthMe_reportsTheActualPersistedAdminRole() throws Exception {
        Member admin = createMember(MemberRole.ADMIN);
        String accessToken = login(admin);

        mockMvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.roles[0]", is("ADMIN")));
    }

    @Test
    void memberAuthMe_stillReportsMemberRole() throws Exception {
        Member member = createMember(MemberRole.MEMBER);
        String accessToken = login(member);

        mockMvc.perform(get("/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.roles[0]", is("MEMBER")));
    }

    // A registered member can never become ADMIN by supplying "role" in the
    // request body. Verified empirically (not assumed): Spring Boot's
    // auto-configured ObjectMapper does NOT fail on unknown JSON properties
    // by default, so this extra "role" field is silently ignored rather than
    // rejected - RegisterRequest has no role component for it to bind to at
    // all, so it has nowhere to go. Registration still succeeds normally,
    // and the resulting member is still exactly MEMBER.
    @Test
    void registration_withClientSuppliedAdminRole_isIgnoredAndNeverGrantsAdmin() throws Exception {
        String email = "wannabe-admin-" + UUID.randomUUID() + "@example.com";

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"role\":\"ADMIN\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.user.roles[0]", is("MEMBER")));

        Member saved = memberRepository.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        assertThat(saved.getRole()).isEqualTo(MemberRole.MEMBER);
    }

    // Same guarantee for login: a client cannot smuggle a role claim into an
    // otherwise-valid login request for an existing MEMBER - the extra
    // property is silently ignored (see the registration test above), and
    // the token still carries the member's real, persisted role.
    @Test
    void login_withClientSuppliedAdminRole_isIgnored_andRealRoleIsReturned() throws Exception {
        Member member = createMember(MemberRole.MEMBER);

        String responseJson = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + member.getEmail() + "\",\"password\":\"" + PASSWORD
                    + "\",\"role\":\"ADMIN\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.roles[0]", is("MEMBER")))
            .andReturn().getResponse().getContentAsString();

        String accessToken = JsonPath.read(responseJson, "$.accessToken");
        assertThat(rolesInToken(accessToken)).containsExactly("MEMBER");
    }
}
