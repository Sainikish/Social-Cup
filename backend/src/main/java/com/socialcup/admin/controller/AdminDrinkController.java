package com.socialcup.admin.controller;

import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.dto.UpdateDrinkRequest;
import com.socialcup.drink.dto.UpdateDrinkStatusRequest;
import com.socialcup.drink.service.DrinkService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/admin/drinks")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDrinkController {

    private final DrinkService drinkService;

    public AdminDrinkController(DrinkService drinkService) {
        this.drinkService = drinkService;
    }

    @PutMapping("/{id}")
    public ResponseEntity<DrinkResponse> updateDrink(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDrinkRequest request) {
        DrinkResponse updated = drinkService.updateDrink(id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<DrinkResponse> updateDrinkStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDrinkStatusRequest request) {
        DrinkResponse updated = drinkService.updateDrinkStatus(id, request);
        return ResponseEntity.ok(updated);
    }
}
