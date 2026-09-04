package com.socialcup.cafe.dto;

import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.drink.dto.DrinkResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

// Admin-facing cafe detail, returned only by the /admin/cafes write endpoints.
// Carries payoutRate (what Social Cup pays the cafe per credit) in addition to
// everything in the public CafeDetailResponse - internal business information
// that must never appear in the public GET /cafes/{id} response.
public record AdminCafeDetailResponse(
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
    BigDecimal payoutRate,
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
