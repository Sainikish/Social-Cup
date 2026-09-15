package com.socialcup.rating.repository;

import com.socialcup.rating.dto.CafeRatingAggregate;
import com.socialcup.rating.dto.DrinkRatingAggregate;
import com.socialcup.rating.entity.DrinkRating;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
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

    // Phase 6H (rating aggregation): one query per PAGE of drinks, not one per
    // drink - the whole point of this method existing at all instead of each
    // DrinkResponse independently averaging its own ratingRepository.findAllByDrinkId.
    // A drink with zero ratings simply produces no row (GROUP BY over zero rows
    // yields nothing), so DrinkRatingAggregate.averageRating is never null for a
    // row that IS returned - callers distinguish "no ratings yet" by the drinkId
    // being absent from the result altogether, not by an average of null/0.
    @Query("SELECT r.drink.id AS drinkId, AVG(r.rating) AS averageRating, COUNT(r) AS ratingCount "
        + "FROM DrinkRating r WHERE r.drink.id IN :drinkIds GROUP BY r.drink.id")
    List<DrinkRatingAggregate> findRatingAggregatesByDrinkIds(@Param("drinkIds") Collection<UUID> drinkIds);

    // Phase 6H: a cafe's rating is explicitly "the average of its drinks'
    // ratings" per PRD Module 6, not a flat re-aggregation of every raw rating
    // row underneath it - a cafe with one 5-star drink (a single rating) and one
    // 1-star drink (a hundred ratings) must average to 3, not something close to
    // 1. That two-level average (average-of-averages, grouped by cafe) can't be
    // expressed as a single-level SQL GROUP BY, hence the nested query: the inner
    // query first collapses `rating` to one row per drink (its own average +
    // count), the outer query then averages THOSE per-drink averages per cafe.
    // Native SQL (like CafeRepository.findNearbyCafes) rather than JPQL, which
    // has no subquery-in-FROM support. Column aliases are double-quoted so
    // Postgres preserves their exact case for the interface projection to match
    // (an unquoted alias is folded to lowercase, which getCafeId()/getAverageRating()
    // would then fail to bind to). Scoped to ACTIVE, non-archived drinks only -
    // the same set drinkService.getActiveDrinksForCafe already treats as "this
    // cafe's real menu" - so a discontinued/archived drink's old ratings don't
    // keep dragging the cafe's current rating around.
    @Query(value = """
        SELECT d.cafe_id AS "cafeId",
               AVG(drink_avg.avg_rating) AS "averageRating",
               SUM(drink_avg.rating_count) AS "ratingCount"
        FROM (
            SELECT r.drink_id AS drink_id, AVG(r.stars) AS avg_rating, COUNT(*) AS rating_count
            FROM rating r
            GROUP BY r.drink_id
        ) drink_avg
        JOIN drink d ON d.id = drink_avg.drink_id
        WHERE d.cafe_id IN (:cafeIds) AND d.status = 'ACTIVE' AND d.archived_at IS NULL
        GROUP BY d.cafe_id
        """, nativeQuery = true)
    List<CafeRatingAggregate> findCafeRatingAggregatesByCafeIds(@Param("cafeIds") Collection<UUID> cafeIds);
}
