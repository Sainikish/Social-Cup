package com.socialcup.drink.repository;

import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DrinkRepository extends JpaRepository<Drink, UUID> {

    // @EntityGraph(attributePaths = "cafe") on the finder/listing methods below:
    // DrinkResponse.fromEntity always reads drink.getCafe().getId()/getName(), and
    // Drink.cafe is @ManyToOne(FetchType.LAZY). Without fetching it in the same
    // query, each distinct cafe among the returned drinks triggers its own
    // "SELECT ... FROM cafe WHERE id = ?" - an N+1 for any listing that can span
    // multiple cafes (signature drinks, most obviously). The exists-only checks
    // below are deliberately left without a graph: they return a boolean and never
    // touch a Drink's cafe association, so fetching it would be pure waste.

    @EntityGraph(attributePaths = "cafe")
    Optional<Drink> findByIdAndArchivedAtIsNull(UUID id);

    @EntityGraph(attributePaths = "cafe")
    Page<Drink> findAllByCafeIdAndStatusAndArchivedAtIsNull(UUID cafeId, DrinkStatus status, Pageable pageable);

    @EntityGraph(attributePaths = "cafe")
    Page<Drink> findAllByCafeIdAndArchivedAtIsNull(UUID cafeId, Pageable pageable);

    @EntityGraph(attributePaths = "cafe")
    Page<Drink> findAllBySignatureTrueAndStatusAndArchivedAtIsNull(DrinkStatus status, Pageable pageable);

    @EntityGraph(attributePaths = "cafe")
    List<Drink> findAllByCafeIdAndStatusAndArchivedAtIsNull(UUID cafeId, DrinkStatus status);

    boolean existsByCafeIdAndNameIgnoreCaseAndArchivedAtIsNull(UUID cafeId, String name);

    boolean existsByCafeIdAndNameIgnoreCaseAndIdNotAndArchivedAtIsNull(UUID cafeId, String name, UUID id);

    // Added for Phase 6 (rating module): a lightweight existence check that
    // still respects the archived-is-not-found convention, without paying for
    // findByIdAndArchivedAtIsNull's cafe EntityGraph when only a boolean is needed.
    boolean existsByIdAndArchivedAtIsNull(UUID id);
}
