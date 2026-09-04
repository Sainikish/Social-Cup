package com.socialcup.admin.controller;

import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.dto.UpdateDrinkRequest;
import com.socialcup.drink.dto.UpdateDrinkStatusRequest;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminDrinkController.class)
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
class AdminDrinkControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private DrinkService drinkService;

    @Test
    void updateDrink_unauthenticated_returns401() throws Exception {
        UUID drinkId = UUID.randomUUID();
        mockMvc.perform(put("/admin/drinks/{id}", drinkId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Updated Drink",
                        "retailPrice": 4.50,
                        "creditPrice": 1
                    }
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }

    @Test
    void updateDrink_asMember_returns403() throws Exception {
        String token = tokenProvider.generateAccessToken("member-1", List.of(Roles.MEMBER));
        UUID drinkId = UUID.randomUUID();

        mockMvc.perform(put("/admin/drinks/{id}", drinkId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Updated Drink",
                        "retailPrice": 4.50,
                        "creditPrice": 1
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
    }

    @Test
    void updateDrink_asBarista_returns403() throws Exception {
        String token = tokenProvider.generateAccessToken("barista-1", List.of(Roles.BARISTA));
        UUID drinkId = UUID.randomUUID();

        mockMvc.perform(put("/admin/drinks/{id}", drinkId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Updated Drink",
                        "retailPrice": 4.50,
                        "creditPrice": 1
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));
    }

    @Test
    void updateDrink_asAdmin_returns200() throws Exception {
        String token = tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));
        UUID drinkId = UUID.randomUUID();

        DrinkResponse response = new DrinkResponse(
            drinkId, UUID.randomUUID(), "Cafe", "Caramel Macchiato", "Coffee", null, new BigDecimal("5.25"), 1, null, false, DrinkStatus.ACTIVE, Instant.now(), Instant.now()
        );

        when(drinkService.updateDrink(eq(drinkId), any(UpdateDrinkRequest.class))).thenReturn(response);

        mockMvc.perform(put("/admin/drinks/{id}", drinkId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Caramel Macchiato",
                        "retailPrice": 5.25,
                        "creditPrice": 1
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", is(drinkId.toString())))
            .andExpect(jsonPath("$.name", is("Caramel Macchiato")));
    }

    @Test
    void updateDrink_invalidPrice_returns400() throws Exception {
        String token = tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));
        UUID drinkId = UUID.randomUUID();

        mockMvc.perform(put("/admin/drinks/{id}", drinkId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Caramel Macchiato",
                        "retailPrice": -5.00,
                        "creditPrice": 0
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));
    }

    @Test
    void updateDrinkStatus_asAdmin_returns200() throws Exception {
        String token = tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));
        UUID drinkId = UUID.randomUUID();

        DrinkResponse response = new DrinkResponse(
            drinkId, UUID.randomUUID(), "Cafe", "Drink", "Coffee", null, new BigDecimal("4.00"), 1, null, false, DrinkStatus.INACTIVE, Instant.now(), Instant.now()
        );

        when(drinkService.updateDrinkStatus(eq(drinkId), any(UpdateDrinkStatusRequest.class))).thenReturn(response);

        mockMvc.perform(patch("/admin/drinks/{id}/status", drinkId)
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
}
