package com.socialcup.drink.dto;

import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// averageRating/ratingCount are never read off the Drink entity itself (there
// is no such column) - they come from a separate, batched RatingRepository
// aggregate query (see DrinkService), which is why fromEntity below takes them
// as explicit parameters rather than deriving them internally. averageRating
// is null (not 0.0/0) whenever ratingCount is 0 - the PRD's "New" indication
// for an unrated drink depends on being able to tell "never rated" apart from
// "rated, and it's bad".
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
    Instant updatedAt,
    Double averageRating,
    long ratingCount
) {
    public static DrinkResponse fromEntity(Drink drink, Double averageRating, long ratingCount) {
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
            drink.getUpdatedAt(),
            averageRating,
            ratingCount
        );
    }
}
