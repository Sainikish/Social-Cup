package com.socialcup.drink.dto;

import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;

import java.math.BigDecimal;
import java.util.UUID;

// See DrinkResponse's own note: averageRating/ratingCount come from a
// separate batched aggregate query, never from the entity itself, and
// averageRating is null (not 0.0) whenever ratingCount is 0.
public record DrinkSummaryResponse(
    UUID id,
    UUID cafeId,
    String name,
    String type,
    BigDecimal retailPrice,
    int creditPrice,
    String photoUrl,
    boolean signature,
    DrinkStatus status,
    Double averageRating,
    long ratingCount
) {
    public static DrinkSummaryResponse fromEntity(Drink drink, Double averageRating, long ratingCount) {
        return new DrinkSummaryResponse(
            drink.getId(),
            drink.getCafe() != null ? drink.getCafe().getId() : null,
            drink.getName(),
            drink.getType(),
            drink.getRetailPrice(),
            drink.getCreditPrice(),
            drink.getPhotoUrl(),
            drink.isSignature(),
            drink.getStatus(),
            averageRating,
            ratingCount
        );
    }
}
