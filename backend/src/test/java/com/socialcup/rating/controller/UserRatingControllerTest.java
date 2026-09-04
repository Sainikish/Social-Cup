package com.socialcup.rating.controller;

import com.socialcup.common.dto.PageResponse;
import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.rating.dto.RatingResponse;
import com.socialcup.rating.service.RatingService;
import com.socialcup.security.JwtAuthenticationFilter;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.RestAccessDeniedHandler;
import com.socialcup.security.RestAuthenticationEntryPoint;
import com.socialcup.security.Roles;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserRatingController.class)
@Import({
    WebConfig.class,
    RateLimitProperties.class,
    SecurityConfig.class,
    JwtAuthenticationFilter.class,
    JwtTokenProvider.class,
    RestAuthenticationEntryPoint.class,
    RestAccessDeniedHandler.class,
    ApiErrorResponseWriter.class,
    CorsProperties.class,
    GlobalExceptionHandler.class
})
class UserRatingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private RatingService ratingService;

    private RatingResponse sampleRatingResponse() {
        return new RatingResponse(
            UUID.randomUUID(), UUID.randomUUID(), "Cortado", UUID.randomUUID(), "Blue Bottle Coffee",
            5, "Excellent espresso!", Instant.now(), Instant.now()
        );
    }

    // ---- /users/me/ratings ----

    @Test
    void getMyRatings_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/users/me/ratings"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }

    @Test
    void getMyRatings_authenticated_returns200_andNeverAcceptsUserIdFromClient() throws Exception {
        UUID memberId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));
        var pageable = PageRequest.of(0, 20);

        when(ratingService.getRatingsForMember(eq(memberId), any()))
            .thenReturn(PageResponse.of(new PageImpl<>(List.of(sampleRatingResponse()), pageable, 1)));

        // No userId is ever supplied by the client - only the Bearer token
        // determines whose ratings come back, and the mock above only
        // stubs a response for memberId resolved from that token's subject.
        mockMvc.perform(get("/users/me/ratings").param("userId", UUID.randomUUID().toString())
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].drinkName", is("Cortado")));
    }

    @Test
    void getMyRatings_supportsPagination() throws Exception {
        UUID memberId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));
        var pageable = PageRequest.of(1, 5);

        when(ratingService.getRatingsForMember(eq(memberId), any()))
            .thenReturn(PageResponse.of(new PageImpl<>(List.of(), pageable, 12)));

        mockMvc.perform(get("/users/me/ratings")
                .param("page", "1")
                .param("size", "5")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.page", is(1)))
            .andExpect(jsonPath("$.size", is(5)))
            .andExpect(jsonPath("$.totalElements", is(12)));
    }

    // ---- /users/me/diary ----

    @Test
    void getMyDiary_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/users/me/diary"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }

    @Test
    void getMyDiary_authenticated_returns200() throws Exception {
        UUID memberId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));
        var pageable = PageRequest.of(0, 20);

        when(ratingService.getRatingsForMember(eq(memberId), any()))
            .thenReturn(PageResponse.of(new PageImpl<>(List.of(sampleRatingResponse()), pageable, 1)));

        mockMvc.perform(get("/users/me/diary")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].drinkName", is("Cortado")));
    }
}
