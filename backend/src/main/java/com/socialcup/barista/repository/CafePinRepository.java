package com.socialcup.barista.repository;

import com.socialcup.barista.entity.CafePin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CafePinRepository extends JpaRepository<CafePin, UUID> {

    // The only lookup barista login/refresh actually need: a cafe terminal
    // authenticates by cafe id, not by this row's own generated id.
    Optional<CafePin> findByCafeId(UUID cafeId);
}
