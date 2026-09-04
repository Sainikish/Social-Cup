package com.socialcup.drink.controller;

import com.socialcup.common.dto.PageResponse;
import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.entity.DrinkStatus;
import com.socialcup.drink.service.DrinkService;
import com.socialcup.security.JwtAuthenticationFilter;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.RestAccessDeniedHandler;
import com.socialcup.security.RestAuthenticationEntryPoint;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DrinkController.class)
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
class DrinkControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DrinkService drinkService;

    @Test
    void getDrinkById_publiclyAccessible_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        DrinkResponse drink = new DrinkResponse(
            id, UUID.randomUUID(), "Cafe Star", "Cappuccino", "Coffee", "Foamy", new BigDecimal("4.25"), 1, "http://photo.jpg", false, DrinkStatus.ACTIVE, Instant.now(), Instant.now()
        );

        when(drinkService.getDrinkById(id)).thenReturn(drink);

        mockMvc.perform(get("/drinks/{id}", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", is(id.toString())))
            .andExpect(jsonPath("$.name", is("Cappuccino")))
            .andExpect(jsonPath("$.retailPrice", is(4.25)))
            .andExpect(jsonPath("$.creditPrice", is(1)));
    }

    @Test
    void getDrinkById_notFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(drinkService.getDrinkById(id)).thenThrow(new ResourceNotFoundException("Drink not found with id: " + id));

        mockMvc.perform(get("/drinks/{id}", id))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")));
    }

    @Test
    void getSignatureDrinks_publiclyAccessible_returns200() throws Exception {
        DrinkResponse drink = new DrinkResponse(
            UUID.randomUUID(), UUID.randomUUID(), "Cafe Star", "Honey Lavender Latte", "Signature", "Floral and sweet", new BigDecimal("6.00"), 1, "http://photo.jpg", true, DrinkStatus.ACTIVE, Instant.now(), Instant.now()
        );
        PageResponse<DrinkResponse> page = PageResponse.of(new PageImpl<>(List.of(drink), PageRequest.of(0, 10), 1));

        when(drinkService.getSignatureDrinks(any())).thenReturn(page);

        mockMvc.perform(get("/drinks/signature"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(1)))
            .andExpect(jsonPath("$.content[0].name", is("Honey Lavender Latte")))
            .andExpect(jsonPath("$.content[0].signature", is(true)));
    }
}
