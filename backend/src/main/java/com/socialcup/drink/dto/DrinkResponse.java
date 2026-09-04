package com.socialcup.drink.dto;

import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record DrinkResponse(
    UUID id,
    UUID cafeId,
    String cafeName,
    String name,
    String type,
    String description,
    BigDecimal retailPrice,
    int creditPrice,
    String photoUrl,
    boolean signature,
    DrinkStatus status,
    Instant createdAt,
    Instant updatedAt
) {
    public static DrinkResponse fromEntity(Drink drink) {
        return new DrinkResponse(
            drink.getId(),
            drink.getCafe() != null ? drink.getCafe().getId() : null,
            drink.getCafe() != null ? drink.getCafe().getName() : null,
            drink.getName(),
            drink.getType(),
            drink.getDescription(),
            drink.getRetailPrice(),
            drink.getCreditPrice(),
            drink.getPhotoUrl(),
            drink.isSignature(),
            drink.getStatus(),
            drink.getCreatedAt(),
            drink.getUpdatedAt()
        );
    }
}
