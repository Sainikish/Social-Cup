package com.socialcup.drink.controller;

import com.socialcup.common.dto.PageResponse;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.service.DrinkService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/drinks")
public class DrinkController {

    private final DrinkService drinkService;

    public DrinkController(DrinkService drinkService) {
        this.drinkService = drinkService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<DrinkResponse> getDrinkById(@PathVariable UUID id) {
        return ResponseEntity.ok(drinkService.getDrinkById(id));
    }

    @GetMapping("/signature")
    public ResponseEntity<PageResponse<DrinkResponse>> getSignatureDrinks(Pageable pageable) {
        return ResponseEntity.ok(drinkService.getSignatureDrinks(pageable));
    }
}
