package com.socialcup.cafe.controller;

import com.socialcup.cafe.dto.CafeDetailResponse;
import com.socialcup.cafe.dto.CafeSummaryResponse;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.service.CafeService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CafeController.class)
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
class CafeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CafeService cafeService;

    @MockitoBean
    private DrinkService drinkService;

    @Test
    void getCafes_publiclyAccessible_returns200() throws Exception {
        UUID cafeId = UUID.randomUUID();
        CafeSummaryResponse summary = new CafeSummaryResponse(
            cafeId, "Cafe Alpha", "123 Street", "Downtown", new BigDecimal("40.71"), new BigDecimal("-74.00"), true, CafeStatus.ACTIVE, "vibe", "http://photo.jpg", null
        );
        PageResponse<CafeSummaryResponse> page = PageResponse.of(new PageImpl<>(List.of(summary), PageRequest.of(0, 10), 1));

        when(cafeService.getCafes(any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/cafes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(1)))
            .andExpect(jsonPath("$.content[0].name", is("Cafe Alpha")))
            .andExpect(jsonPath("$.content[0].neighbourhood", is("Downtown")));
    }

    @Test
    void getCafeById_found_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        CafeDetailResponse detail = new CafeDetailResponse(
            id, "Cafe Beta", "456 Avenue", "Uptown", new BigDecimal("40.75"), new BigDecimal("-73.98"),
            List.of(), "555-1234", "beta@cafe.com", "http://cafe.com",
            false, "vibe", "description", CafeStatus.ACTIVE, List.of(), List.of(), Instant.now(), Instant.now()
        );

        when(cafeService.getCafeById(id)).thenReturn(detail);

        mockMvc.perform(get("/cafes/{id}", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", is(id.toString())))
            .andExpect(jsonPath("$.name", is("Cafe Beta")));
    }

    @Test
    void getCafeById_neverExposesPayoutRate() throws Exception {
        UUID id = UUID.randomUUID();
        CafeDetailResponse detail = new CafeDetailResponse(
            id, "Cafe Beta", "456 Avenue", "Uptown", new BigDecimal("40.75"), new BigDecimal("-73.98"),
            List.of(), "555-1234", "beta@cafe.com", "http://cafe.com",
            false, "vibe", "description", CafeStatus.ACTIVE, List.of(), List.of(), Instant.now(), Instant.now()
        );

        when(cafeService.getCafeById(id)).thenReturn(detail);

        mockMvc.perform(get("/cafes/{id}", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.payoutRate").doesNotExist());
    }

    @Test
    void getCafeById_notFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(cafeService.getCafeById(id)).thenThrow(new ResourceNotFoundException("Cafe not found with id: " + id));

        mockMvc.perform(get("/cafes/{id}", id))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code", is("RESOURCE_NOT_FOUND")));
    }

    @Test
    void searchCafes_returns200() throws Exception {
        UUID cafeId = UUID.randomUUID();
        CafeSummaryResponse summary = new CafeSummaryResponse(
            cafeId, "Search Match", "789 Blvd", "SoHo", new BigDecimal("40.72"), new BigDecimal("-74.00"), false, CafeStatus.ACTIVE, "modern", null, 0.45
        );
        PageResponse<CafeSummaryResponse> page = PageResponse.of(new PageImpl<>(List.of(summary), PageRequest.of(0, 10), 1));

        when(cafeService.searchCafes(eq("match"), eq("SoHo"), eq(40.72), eq(-74.00), any())).thenReturn(page);

        mockMvc.perform(get("/cafes/search")
                .param("q", "match")
                .param("neighbourhood", "SoHo")
                .param("lat", "40.72")
                .param("lng", "-74.00"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].name", is("Search Match")))
            .andExpect(jsonPath("$.content[0].distanceKm", is(0.45)));
    }

    @Test
    void getFeaturedCafes_returns200() throws Exception {
        PageResponse<CafeSummaryResponse> page = PageResponse.of(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        when(cafeService.getFeaturedCafes(any())).thenReturn(page);

        mockMvc.perform(get("/cafes/featured"))
            .andExpect(status().isOk());
    }

    @Test
    void getCafeDrinks_returns200() throws Exception {
        UUID cafeId = UUID.randomUUID();
        DrinkResponse drink = new DrinkResponse(
            UUID.randomUUID(), cafeId, "Cafe Beta", "Espresso", "Coffee", "Shot", new BigDecimal("3.00"), 1, null, false, DrinkStatus.ACTIVE, Instant.now(), Instant.now()
        );
        PageResponse<DrinkResponse> page = PageResponse.of(new PageImpl<>(List.of(drink), PageRequest.of(0, 10), 1));

        when(drinkService.getDrinksByCafe(eq(cafeId), eq(false), any())).thenReturn(page);

        mockMvc.perform(get("/cafes/{id}/drinks", cafeId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].name", is("Espresso")));
    }
}
