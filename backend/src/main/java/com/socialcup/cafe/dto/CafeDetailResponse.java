package com.socialcup.cafe.dto;

import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.drink.dto.DrinkResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

// Public, customer-facing cafe detail (GET /cafes/{id}). Deliberately excludes
// payoutRate and any other internal/admin-only fields - see AdminCafeDetailResponse
// for the admin-facing counterpart used by the write endpoints under /admin/cafes.
public record CafeDetailResponse(
    UUID id,
    String name,
    String address,
    String neighbourhood,
    BigDecimal latitude,
    BigDecimal longitude,
    List<CafeHoursDto> openingHours,
    String phoneNumber,
    String email,
    String website,
    boolean featured,
    String vibeTags,
    String description,
    CafeStatus status,
    List<CafePhotoDto> photos,
    List<DrinkResponse> drinks,
    Instant createdAt,
    Instant updatedAt
) {
}
