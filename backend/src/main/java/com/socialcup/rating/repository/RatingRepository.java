package com.socialcup.rating.repository;

import com.socialcup.rating.entity.DrinkRating;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RatingRepository extends JpaRepository<DrinkRating, UUID> {

    // @EntityGraph below mirrors the pattern established in DrinkRepository
    // (see Phase 5.1): each response DTO reads a LAZY association in the same
    // request, so it must be fetched in the originating query or every row
    // triggers its own extra SELECT. findAllByDrinkId feeds DrinkRatingResponse
    // (needs rating.getMember() for the reviewer). findAllByMemberId and
    // findByMemberIdAndDrinkId feed RatingResponse (needs rating.getDrink()
    // and, through it, drink.getCafe()). existsByMemberIdAndDrinkId is a
    // boolean pre-check and never touches either association, so it is
    // deliberately left without a graph.

    @EntityGraph(attributePaths = "member")
    Page<DrinkRating> findAllByDrinkId(UUID drinkId, Pageable pageable);

    @EntityGraph(attributePaths = {"drink", "drink.cafe"})
    Page<DrinkRating> findAllByMemberId(UUID memberId, Pageable pageable);

    @EntityGraph(attributePaths = {"drink", "drink.cafe"})
    Optional<DrinkRating> findByMemberIdAndDrinkId(UUID memberId, UUID drinkId);

    boolean existsByMemberIdAndDrinkId(UUID memberId, UUID drinkId);
}
