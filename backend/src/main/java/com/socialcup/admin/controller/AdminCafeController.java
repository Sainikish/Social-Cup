package com.socialcup.admin.controller;

import com.socialcup.barista.dto.CafePinResetResponse;
import com.socialcup.barista.service.BaristaAuthService;
import com.socialcup.cafe.dto.AdminCafeDetailResponse;
import com.socialcup.cafe.dto.CafePhotoDto;
import com.socialcup.cafe.dto.CafeSummaryResponse;
import com.socialcup.cafe.dto.CreateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeStatusRequest;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.service.CafeService;
import com.socialcup.common.dto.PageResponse;
import com.socialcup.drink.dto.CreateDrinkRequest;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.service.DrinkService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/admin/cafes")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCafeController {

    private final CafeService cafeService;
    private final DrinkService drinkService;
    private final BaristaAuthService baristaAuthService;

    public AdminCafeController(CafeService cafeService, DrinkService drinkService, BaristaAuthService baristaAuthService) {
        this.cafeService = cafeService;
        this.drinkService = drinkService;
        this.baristaAuthService = baristaAuthService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<CafeSummaryResponse>> searchCafes(
            @RequestParam(name = "q", required = false) String searchQuery,
            @RequestParam(required = false) CafeStatus status,
            @PageableDefault(sort = "name") Pageable pageable) {
        return ResponseEntity.ok(cafeService.getCafesForAdmin(searchQuery, status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminCafeDetailResponse> getCafeById(@PathVariable UUID id) {
        return ResponseEntity.ok(cafeService.getCafeByIdForAdmin(id));
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

    @PostMapping(value = "/{cafeId}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CafePhotoDto> addCafePhoto(
            @PathVariable UUID cafeId,
            @RequestPart("photo") MultipartFile photo) {
        CafePhotoDto created = cafeService.addPhoto(cafeId, photo);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{cafeId}/photos/{photoId}")
    public ResponseEntity<Void> removeCafePhoto(
            @PathVariable UUID cafeId,
            @PathVariable UUID photoId) {
        cafeService.removePhoto(cafeId, photoId);
        return ResponseEntity.noContent().build();
    }

    // Sets (if this cafe never had one) or resets its barista PIN, returning
    // the new plaintext value exactly once - see CafePinResetResponse and
    // BaristaAuthService.resetPin. A reset also signs every device already
    // trusted with the old PIN out, per PRD 8.4.
    @PostMapping("/{cafeId}/pin/reset")
    public ResponseEntity<CafePinResetResponse> resetCafePin(@PathVariable UUID cafeId) {
        return ResponseEntity.ok(baristaAuthService.resetPin(cafeId));
    }
}
