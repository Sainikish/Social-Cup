package com.socialcup.admin.controller;

import com.socialcup.cafe.dto.AdminCafeDetailResponse;
import com.socialcup.cafe.dto.CreateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeStatusRequest;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.service.CafeService;
import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.drink.dto.CreateDrinkRequest;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.entity.DrinkStatus;
import com.socialcup.drink.service.DrinkService;
import com.socialcup.security.JwtAuthenticationFilter;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.RestAccessDeniedHandler;
import com.socialcup.security.RestAuthenticationEntryPoint;
import com.socialcup.security.Roles;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminCafeController.class)
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
class AdminCafeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private CafeService cafeService;

    @MockitoBean
    private DrinkService drinkService;

    @Test
    void createCafe_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/admin/cafes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "New Cafe",
                        "address": "123 Street"
                    }
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }

    @Test
    void createCafe_asMember_returns403() throws Exception {
        String token = tokenProvider.generateAccessToken("member-1", List.of(Roles.MEMBER));

        mockMvc.perform(post("/admin/cafes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "New Cafe",
                        "address": "123 Street"
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
    }

    @Test
    void createCafe_asBarista_returns403() throws Exception {
        String token = tokenProvider.generateAccessToken("barista-1", List.of(Roles.BARISTA));

        mockMvc.perform(post("/admin/cafes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "New Cafe",
                        "address": "123 Street"
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
    }

    @Test
    void createCafe_asAdmin_returns201() throws Exception {
        String token = tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));
        UUID cafeId = UUID.randomUUID();

        AdminCafeDetailResponse detail = new AdminCafeDetailResponse(
            cafeId, "Artisan Cafe", "123 Main St", "Downtown", new BigDecimal("40.71"), new BigDecimal("-74.00"),
            List.of(), "555-1234", "info@artisan.com", "http://artisan.com", new BigDecimal("0.8000"),
            true, "cozy", "A lovely cafe", CafeStatus.ACTIVE, List.of(), List.of(), Instant.now(), Instant.now()
        );

        when(cafeService.createCafe(any(CreateCafeRequest.class))).thenReturn(detail);

        mockMvc.perform(post("/admin/cafes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Artisan Cafe",
                        "address": "123 Main St",
                        "neighbourhood": "Downtown",
                        "latitude": 40.71,
                        "longitude": -74.00,
                        "featured": true,
                        "vibeTags": "cozy"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id", is(cafeId.toString())))
            .andExpect(jsonPath("$.name", is("Artisan Cafe")))
            .andExpect(jsonPath("$.payoutRate", is(0.8000)));
    }

    @Test
    void createCafe_invalidCoordinates_returns400() throws Exception {
        String token = tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));

        mockMvc.perform(post("/admin/cafes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Invalid Geo Cafe",
                        "address": "123 Main St",
                        "latitude": 120.00,
                        "longitude": -200.00
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));
    }

    @Test
    void updateCafe_asAdmin_returns200() throws Exception {
        String token = tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));
        UUID cafeId = UUID.randomUUID();

        AdminCafeDetailResponse detail = new AdminCafeDetailResponse(
            cafeId, "Updated Cafe", "123 Main St", "Downtown", null, null,
            List.of(), null, null, null, new BigDecimal("0.8000"),
            false, null, null, CafeStatus.ACTIVE, List.of(), List.of(), Instant.now(), Instant.now()
        );

        when(cafeService.updateCafe(eq(cafeId), any(UpdateCafeRequest.class))).thenReturn(detail);

        mockMvc.perform(put("/admin/cafes/{id}", cafeId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Updated Cafe",
                        "address": "123 Main St"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name", is("Updated Cafe")));
    }

    @Test
    void updateCafeStatus_asAdmin_returns200() throws Exception {
        String token = tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));
        UUID cafeId = UUID.randomUUID();

        AdminCafeDetailResponse detail = new AdminCafeDetailResponse(
            cafeId, "Cafe", "123 Main St", null, null, null,
            List.of(), null, null, null, new BigDecimal("0.8000"),
            false, null, null, CafeStatus.INACTIVE, List.of(), List.of(), Instant.now(), Instant.now()
        );

        when(cafeService.updateCafeStatus(eq(cafeId), any(UpdateCafeStatusRequest.class))).thenReturn(detail);

        mockMvc.perform(patch("/admin/cafes/{id}/status", cafeId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "status": "INACTIVE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status", is("INACTIVE")));
    }

    @Test
    void createDrinkForCafe_asAdmin_returns201() throws Exception {
        String token = tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));
        UUID cafeId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();

        DrinkResponse response = new DrinkResponse(
            drinkId, cafeId, "Cafe", "Matcha Latte", "Tea", "Ceremonial grade", new BigDecimal("5.50"), 1, null, true, DrinkStatus.ACTIVE, Instant.now(), Instant.now()
        );

        when(drinkService.createDrink(eq(cafeId), any(CreateDrinkRequest.class))).thenReturn(response);

        mockMvc.perform(post("/admin/cafes/{cafeId}/drinks", cafeId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Matcha Latte",
                        "type": "Tea",
                        "description": "Ceremonial grade",
                        "retailPrice": 5.50,
                        "creditPrice": 1,
                        "signature": true
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id", is(drinkId.toString())))
            .andExpect(jsonPath("$.name", is("Matcha Latte")));
    }
}
