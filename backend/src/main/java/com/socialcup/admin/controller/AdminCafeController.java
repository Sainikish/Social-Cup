package com.socialcup.admin.controller;

import com.socialcup.cafe.dto.AdminCafeDetailResponse;
import com.socialcup.cafe.dto.CreateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeStatusRequest;
import com.socialcup.cafe.service.CafeService;
import com.socialcup.drink.dto.CreateDrinkRequest;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.service.DrinkService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/admin/cafes")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCafeController {

    private final CafeService cafeService;
    private final DrinkService drinkService;

    public AdminCafeController(CafeService cafeService, DrinkService drinkService) {
        this.cafeService = cafeService;
        this.drinkService = drinkService;
    }

    @PostMapping
    public ResponseEntity<AdminCafeDetailResponse> createCafe(@Valid @RequestBody CreateCafeRequest request) {
        AdminCafeDetailResponse created = cafeService.createCafe(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminCafeDetailResponse> updateCafe(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCafeRequest request) {
        AdminCafeDetailResponse updated = cafeService.updateCafe(id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AdminCafeDetailResponse> updateCafeStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCafeStatusRequest request) {
        AdminCafeDetailResponse updated = cafeService.updateCafeStatus(id, request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{cafeId}/drinks")
    public ResponseEntity<DrinkResponse> createDrinkForCafe(
            @PathVariable UUID cafeId,
            @Valid @RequestBody CreateDrinkRequest request) {
        DrinkResponse created = drinkService.createDrink(cafeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
