package com.socialcup.cafe.repository;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CafeRepository extends JpaRepository<Cafe, UUID> {

    Optional<Cafe> findByIdAndArchivedAtIsNull(UUID id);

    Page<Cafe> findAllByStatusAndArchivedAtIsNull(CafeStatus status, Pageable pageable);

    Page<Cafe> findAllByFeaturedTrueAndStatusAndArchivedAtIsNull(CafeStatus status, Pageable pageable);

    Page<Cafe> findAllByNeighbourhoodIgnoreCaseAndStatusAndArchivedAtIsNull(String neighbourhood, CafeStatus status, Pageable pageable);

    Page<Cafe> findAllByNeighbourhoodIgnoreCaseAndFeaturedTrueAndStatusAndArchivedAtIsNull(String neighbourhood, CafeStatus status, Pageable pageable);

    boolean existsByNameIgnoreCaseAndAddressIgnoreCaseAndArchivedAtIsNull(String name, String address);

    boolean existsByNameIgnoreCaseAndAddressIgnoreCaseAndIdNotAndArchivedAtIsNull(String name, String address, UUID id);

    @Query(value = """
        SELECT c.*,
               (6371 * acos(least(1.0, greatest(-1.0, cos(radians(:lat)) * cos(radians(c.latitude)) * cos(radians(c.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(c.latitude)))))) AS distance
        FROM cafe c
        WHERE c.status = 'ACTIVE' AND c.archived_at IS NULL
          AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
          AND (:neighbourhood IS NULL OR LOWER(c.neighbourhood) = LOWER(:neighbourhood))
          AND (:searchQuery IS NULL OR (LOWER(c.name) LIKE LOWER(CONCAT('%', :searchQuery, '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', :searchQuery, '%')) OR LOWER(c.vibe_tags) LIKE LOWER(CONCAT('%', :searchQuery, '%'))))
        ORDER BY distance ASC
        """,
        countQuery = """
        SELECT count(c.id)
        FROM cafe c
        WHERE c.status = 'ACTIVE' AND c.archived_at IS NULL
          AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
          AND (:neighbourhood IS NULL OR LOWER(c.neighbourhood) = LOWER(:neighbourhood))
          AND (:searchQuery IS NULL OR (LOWER(c.name) LIKE LOWER(CONCAT('%', :searchQuery, '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', :searchQuery, '%')) OR LOWER(c.vibe_tags) LIKE LOWER(CONCAT('%', :searchQuery, '%'))))
        """,
        nativeQuery = true)
    Page<Cafe> findNearbyCafes(
        @Param("lat") double lat,
        @Param("lng") double lng,
        @Param("neighbourhood") String neighbourhood,
        @Param("searchQuery") String searchQuery,
        Pageable pageable
    );

    @Query("""
        SELECT c FROM Cafe c
        WHERE c.status = :status AND c.archivedAt IS NULL
          AND (:neighbourhood IS NULL OR LOWER(c.neighbourhood) = LOWER(CAST(:neighbourhood AS string)))
          AND (:searchQuery IS NULL OR (LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:searchQuery AS string), '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', CAST(:searchQuery AS string), '%')) OR LOWER(c.vibeTags) LIKE LOWER(CONCAT('%', CAST(:searchQuery AS string), '%'))))
        """)
    Page<Cafe> searchCafes(
        @Param("searchQuery") String searchQuery,
        @Param("neighbourhood") String neighbourhood,
        @Param("status") CafeStatus status,
        Pageable pageable
    );
}
