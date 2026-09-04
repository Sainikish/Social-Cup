package com.socialcup.cafe.dto;

import com.socialcup.cafe.entity.CafeStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record CafeSummaryResponse(
    UUID id,
    String name,
    String address,
    String neighbourhood,
    BigDecimal latitude,
    BigDecimal longitude,
    boolean featured,
    CafeStatus status,
    String vibeTags,
    String primaryPhotoUrl,
    Double distanceKm
) {
}
