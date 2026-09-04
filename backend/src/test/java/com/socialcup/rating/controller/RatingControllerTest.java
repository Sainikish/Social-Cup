package com.socialcup.rating.controller;

import com.socialcup.common.dto.PageResponse;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.rating.dto.DrinkRatingResponse;
import com.socialcup.rating.dto.RatingAuthorResponse;
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
import org.springframework.http.MediaType;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RatingController.class)
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
class RatingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private RatingService ratingService;

    private static String validRequest(int rating, String note) {
        String noteJson = note == null ? "null" : "\"" + note + "\"";
        return """
            { "rating": %d, "note": %s }
            """.formatted(rating, noteJson);
    }

    private RatingResponse sampleRatingResponse(UUID drinkId) {
        return new RatingResponse(
            UUID.randomUUID(), drinkId, "Cortado", UUID.randomUUID(), "Blue Bottle Coffee",
            5, "Excellent espresso!", Instant.now(), Instant.now()
        );
    }

    // ---- Create ----

    @Test
    void createRating_unauthenticated_returns401() throws Exception {
        UUID drinkId = UUID.randomUUID();
        mockMvc.perform(post("/drinks/{drinkId}/ratings", drinkId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest(5, "Great")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }

    @Test
    void createRating_invalidToken_returns401() throws Exception {
        UUID drinkId = UUID.randomUUID();
        mockMvc.perform(post("/drinks/{drinkId}/ratings", drinkId)
                .header("Authorization", "Bearer not-a-real-jwt")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest(5, "Great")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }

    @Test
    void createRating_asMember_returns201() throws Exception {
        UUID memberId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));

        when(ratingService.createRating(eq(drinkId), eq(memberId), any())).thenReturn(sampleRatingResponse(drinkId));

        mockMvc.perform(post("/drinks/{drinkId}/ratings", drinkId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest(5, "Excellent espresso!")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.rating", is(5)))
            .andExpect(jsonPath("$.note", is("Excellent espresso!")))
            .andExpect(jsonPath("$.drinkId", is(drinkId.toString())));
    }

    @Test
    void createRating_duplicate_returns409() throws Exception {
        UUID memberId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));

        when(ratingService.createRating(eq(drinkId), eq(memberId), any()))
            .thenThrow(new ConflictException("You have already rated this drink"));

        mockMvc.perform(post("/drinks/{drinkId}/ratings", drinkId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest(4, null)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("CONFLICT")));
    }

    @Test
    void createRating_nonExistentDrink_returns404() throws Exception {
        UUID memberId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));

        when(ratingService.createRating(eq(drinkId), eq(memberId), any()))
            .thenThrow(new ResourceNotFoundException("Drink not found with id: " + drinkId));

        mockMvc.perform(post("/drinks/{drinkId}/ratings", drinkId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest(4, null)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")));
    }

    // ---- Validation ----

    @Test
    void createRating_ratingZero_returns400() throws Exception {
        assertValidationRejects(0, null);
    }

    @Test
    void createRating_ratingOne_isAccepted() throws Exception {
        assertValidationAccepts(1, null);
    }

    @Test
    void createRating_ratingFive_isAccepted() throws Exception {
        assertValidationAccepts(5, null);
    }

    @Test
    void createRating_ratingSix_returns400() throws Exception {
        assertValidationRejects(6, null);
    }

    @Test
    void createRating_noteNull_isAccepted() throws Exception {
        assertValidationAccepts(4, null);
    }

    @Test
    void createRating_noteEmpty_isAccepted() throws Exception {
        assertValidationAccepts(4, "");
    }

    @Test
    void createRating_note140Chars_isAccepted() throws Exception {
        assertValidationAccepts(4, "a".repeat(140));
    }

    @Test
    void createRating_note141Chars_returns400() throws Exception {
        assertValidationRejects(4, "a".repeat(141));
    }

    private void assertValidationRejects(int rating, String note) throws Exception {
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(UUID.randomUUID().toString(), List.of(Roles.MEMBER));

        mockMvc.perform(post("/drinks/{drinkId}/ratings", drinkId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest(rating, note)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));
    }

    private void assertValidationAccepts(int rating, String note) throws Exception {
        UUID memberId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));

        when(ratingService.createRating(eq(drinkId), eq(memberId), any())).thenReturn(sampleRatingResponse(drinkId));

        mockMvc.perform(post("/drinks/{drinkId}/ratings", drinkId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest(rating, note)))
            .andExpect(status().isCreated());
    }

    // ---- Update ----

    @Test
    void updateRating_unauthenticated_returns401() throws Exception {
        UUID drinkId = UUID.randomUUID();
        mockMvc.perform(put("/drinks/{drinkId}/ratings", drinkId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest(3, "Updated")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }

    @Test
    void updateRating_asOwner_returns200() throws Exception {
        UUID memberId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));

        when(ratingService.updateRating(eq(drinkId), eq(memberId), any())).thenReturn(sampleRatingResponse(drinkId));

        mockMvc.perform(put("/drinks/{drinkId}/ratings", drinkId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest(5, "Excellent espresso!")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rating", is(5)));
    }

    @Test
    void updateRating_barista_updatingRatingTheyDoNotOwn_returns404() throws Exception {
        // BARISTA is just another authenticated principal here - the service
        // scopes the lookup to (drinkId, the caller's own memberId), so a
        // BARISTA with no rating of their own on this drink gets a plain 404,
        // never another member's row. See RatingServiceTest for the service-
        // level proof of the same guarantee.
        UUID baristaId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(baristaId.toString(), List.of(Roles.BARISTA));

        when(ratingService.updateRating(eq(drinkId), eq(baristaId), any()))
            .thenThrow(new ResourceNotFoundException("Rating not found for this drink"));

        mockMvc.perform(put("/drinks/{drinkId}/ratings", drinkId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest(1, "trying to overwrite")))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")));
    }

    // ---- Get ratings for a drink (public) ----

    @Test
    void getRatingsForDrink_anonymous_returns200() throws Exception {
        UUID drinkId = UUID.randomUUID();
        DrinkRatingResponse response = new DrinkRatingResponse(
            UUID.randomUUID(), drinkId, 5, "Great!",
            new RatingAuthorResponse(UUID.randomUUID(), "Ada", "Lovelace", null),
            Instant.now(), Instant.now()
        );
        var pageable = PageRequest.of(0, 20);
        when(ratingService.getRatingsForDrink(eq(drinkId), any()))
            .thenReturn(PageResponse.of(new PageImpl<>(List.of(response), pageable, 1)));

        mockMvc.perform(get("/drinks/{drinkId}/ratings", drinkId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].rating", is(5)))
            .andExpect(jsonPath("$.content[0].author.firstName", is("Ada")))
            .andExpect(jsonPath("$.content[0].author.lastName", is("Lovelace")));
    }

    @Test
    void getRatingsForDrink_nonExistentDrink_returns404() throws Exception {
        UUID drinkId = UUID.randomUUID();
        when(ratingService.getRatingsForDrink(eq(drinkId), any()))
            .thenThrow(new ResourceNotFoundException("Drink not found with id: " + drinkId));

        mockMvc.perform(get("/drinks/{drinkId}/ratings", drinkId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")));
    }
}
