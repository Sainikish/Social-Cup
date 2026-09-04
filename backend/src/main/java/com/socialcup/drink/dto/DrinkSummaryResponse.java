package com.socialcup.drink.dto;

import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record DrinkSummaryResponse(
    UUID id,
    UUID cafeId,
    String name,
    String type,
    BigDecimal retailPrice,
    int creditPrice,
    String photoUrl,
    boolean signature,
    DrinkStatus status
) {
    public static DrinkSummaryResponse fromEntity(Drink drink) {
        return new DrinkSummaryResponse(
            drink.getId(),
            drink.getCafe() != null ? drink.getCafe().getId() : null,
            drink.getName(),
            drink.getType(),
            drink.getRetailPrice(),
            drink.getCreditPrice(),
            drink.getPhotoUrl(),
            drink.isSignature(),
            drink.getStatus()
        );
    }
}
