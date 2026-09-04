package com.socialcup.rating.dto;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.drink.entity.Drink;
import com.socialcup.rating.entity.DrinkRating;

import java.time.Instant;
import java.util.UUID;

// The authenticated member's own view of one of their ratings - used by the
// create/update responses, /users/me/ratings, and /users/me/diary. Carries
// drink/cafe context (not reviewer identity - the caller already knows it's
// their own rating), the mirror image of DrinkRatingResponse below.
public record RatingResponse(
    UUID id,
    UUID drinkId,
    String drinkName,
    UUID cafeId,
    String cafeName,
    int rating,
    String note,
    Instant createdAt,
    Instant updatedAt
) {
    public static RatingResponse fromEntity(DrinkRating drinkRating) {
        Drink drink = drinkRating.getDrink();
        Cafe cafe = drink != null ? drink.getCafe() : null;
        return new RatingResponse(
            drinkRating.getId(),
            drink != null ? drink.getId() : null,
            drink != null ? drink.getName() : null,
            cafe != null ? cafe.getId() : null,
            cafe != null ? cafe.getName() : null,
            drinkRating.getRating(),
            drinkRating.getNote(),
            drinkRating.getCreatedAt(),
            drinkRating.getUpdatedAt()
        );
    }
}
