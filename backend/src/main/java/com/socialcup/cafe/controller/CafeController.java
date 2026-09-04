package com.socialcup.cafe.controller;

import com.socialcup.cafe.dto.CafeDetailResponse;
import com.socialcup.cafe.dto.CafeSummaryResponse;
import com.socialcup.cafe.service.CafeService;
import com.socialcup.common.dto.PageResponse;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.service.DrinkService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/cafes")
public class CafeController {

    private final CafeService cafeService;
    private final DrinkService drinkService;

    public CafeController(CafeService cafeService, DrinkService drinkService) {
        this.cafeService = cafeService;
        this.drinkService = drinkService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<CafeSummaryResponse>> getCafes(
            @RequestParam(required = false) String neighbourhood,
            @RequestParam(required = false) Boolean featured,
            Pageable pageable) {
        return ResponseEntity.ok(cafeService.getCafes(neighbourhood, featured, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CafeDetailResponse> getCafeById(@PathVariable UUID id) {
        return ResponseEntity.ok(cafeService.getCafeById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<PageResponse<CafeSummaryResponse>> searchCafes(
            @RequestParam(name = "q", required = false) String searchQuery,
            @RequestParam(required = false) String neighbourhood,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            Pageable pageable) {
        return ResponseEntity.ok(cafeService.searchCafes(searchQuery, neighbourhood, lat, lng, pageable));
    }

    @GetMapping("/featured")
    public ResponseEntity<PageResponse<CafeSummaryResponse>> getFeaturedCafes(Pageable pageable) {
        return ResponseEntity.ok(cafeService.getFeaturedCafes(pageable));
    }

    @GetMapping("/{id}/drinks")
    public ResponseEntity<PageResponse<DrinkResponse>> getCafeDrinks(
            @PathVariable UUID id,
            Pageable pageable) {
        return ResponseEntity.ok(drinkService.getDrinksByCafe(id, false, pageable));
    }
}
