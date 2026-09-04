package com.socialcup.rating.dto;

import com.socialcup.rating.entity.DrinkRating;

import java.time.Instant;
import java.util.UUID;

// Public view of a rating left on a drink - who rated it (display-safe only,
// see RatingAuthorResponse) and what they said. The mirror image of
// RatingResponse, which is the rating owner's own view of the same row.
public record DrinkRatingResponse(
    UUID id,
    UUID drinkId,
    int rating,
    String note,
    RatingAuthorResponse author,
    Instant createdAt,
    Instant updatedAt
) {
    public static DrinkRatingResponse fromEntity(DrinkRating drinkRating) {
        return new DrinkRatingResponse(
            drinkRating.getId(),
            drinkRating.getDrink() != null ? drinkRating.getDrink().getId() : null,
            drinkRating.getRating(),
            drinkRating.getNote(),
            RatingAuthorResponse.fromEntity(drinkRating.getMember()),
            drinkRating.getCreatedAt(),
            drinkRating.getUpdatedAt()
        );
    }
}
