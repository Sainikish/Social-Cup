package com.socialcup.rating.dto;

import java.util.UUID;

// Closed interface projection for RatingRepository.findRatingAggregatesByDrinkIds
// - Spring Data binds each getter to the identically-named JPQL alias in that
// query (getDrinkId <- "AS drinkId", etc.), so this is never instantiated
// directly. averageRating is a boxed Double (not a primitive) because a drink
// with zero ratings never appears in the query's GROUP BY result at all -
// callers must treat "no entry for this drinkId" the same as "no ratings yet"
// (see DrinkService), never coerce a missing row into 0.0.
public interface DrinkRatingAggregate {

    UUID getDrinkId();

    Double getAverageRating();

    Long getRatingCount();
}
