package com.socialcup.rating.dto;

import java.util.UUID;

// Closed interface projection for RatingRepository.findCafeRatingAggregatesByCafeIds.
// Per PRD Module 6, a cafe's rating is the average of its own drinks'
// individual averages, not a flat re-aggregation of every raw rating row
// underneath it - averageRating here is exactly that (equal weight per rated
// drink), while ratingCount is the total number of individual ratings across
// all of the cafe's drinks (a display total, not a weight). As with
// DrinkRatingAggregate, a cafe with no rated drinks never appears in the
// query's result at all - "New" is represented by the caller finding no
// entry for a cafeId, never by a coerced 0.0.
public interface CafeRatingAggregate {

    UUID getCafeId();

    Double getAverageRating();

    Long getRatingCount();
}
