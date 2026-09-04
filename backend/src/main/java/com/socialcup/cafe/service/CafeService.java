package com.socialcup.cafe.service;

import com.socialcup.cafe.dto.AdminCafeDetailResponse;
import com.socialcup.cafe.dto.CafeDetailResponse;
import com.socialcup.cafe.dto.CafeSummaryResponse;
import com.socialcup.cafe.dto.CreateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeStatusRequest;
import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.mapper.CafeMapper;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.dto.PageResponse;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.service.DrinkService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class CafeService {

    private final CafeRepository cafeRepository;
    private final CafeMapper cafeMapper;
    private final DrinkService drinkService;

    public CafeService(CafeRepository cafeRepository,
                       CafeMapper cafeMapper,
                       DrinkService drinkService) {
        this.cafeRepository = cafeRepository;
        this.cafeMapper = cafeMapper;
        this.drinkService = drinkService;
    }

    @Transactional(readOnly = true)
    public PageResponse<CafeSummaryResponse> getCafes(String neighbourhood, Boolean featured, Pageable pageable) {
        Page<Cafe> page;
        if (neighbourhood != null && !neighbourhood.isBlank() && Boolean.TRUE.equals(featured)) {
            page = cafeRepository.findAllByNeighbourhoodIgnoreCaseAndFeaturedTrueAndStatusAndArchivedAtIsNull(
                neighbourhood.trim(), CafeStatus.ACTIVE, pageable);
        } else if (neighbourhood != null && !neighbourhood.isBlank()) {
            page = cafeRepository.findAllByNeighbourhoodIgnoreCaseAndStatusAndArchivedAtIsNull(
                neighbourhood.trim(), CafeStatus.ACTIVE, pageable);
        } else if (Boolean.TRUE.equals(featured)) {
            page = cafeRepository.findAllByFeaturedTrueAndStatusAndArchivedAtIsNull(CafeStatus.ACTIVE, pageable);
        } else {
            page = cafeRepository.findAllByStatusAndArchivedAtIsNull(CafeStatus.ACTIVE, pageable);
        }

        return PageResponse.of(page, cafe -> cafeMapper.toSummaryResponse(cafe, null));
    }

    @Transactional(readOnly = true)
    public CafeDetailResponse getCafeById(UUID id) {
        Cafe cafe = cafeRepository.findByIdAndArchivedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cafe not found with id: " + id));

        List<DrinkResponse> drinks = drinkService.getActiveDrinksForCafe(id);
        return cafeMapper.toDetailResponse(cafe, drinks);
    }

    @Transactional(readOnly = true)
    public PageResponse<CafeSummaryResponse> getFeaturedCafes(Pageable pageable) {
        Page<Cafe> page = cafeRepository.findAllByFeaturedTrueAndStatusAndArchivedAtIsNull(CafeStatus.ACTIVE, pageable);
        return PageResponse.of(page, cafe -> cafeMapper.toSummaryResponse(cafe, null));
    }

    @Transactional(readOnly = true)
    public PageResponse<CafeSummaryResponse> searchCafes(
            String searchQuery,
            String neighbourhood,
            Double latitude,
            Double longitude,
            Pageable pageable) {

        String trimmedQuery = searchQuery != null && !searchQuery.isBlank() ? searchQuery.trim() : null;
        String trimmedNeighbourhood = neighbourhood != null && !neighbourhood.isBlank() ? neighbourhood.trim() : null;

        if (latitude != null && longitude != null) {
            Page<Cafe> page = cafeRepository.findNearbyCafes(
                latitude, longitude, trimmedNeighbourhood, trimmedQuery, pageable);
            return PageResponse.of(page, cafe -> {
                Double distance = null;
                if (cafe.getLatitude() != null && cafe.getLongitude() != null) {
                    distance = calculateHaversineKm(latitude, longitude,
                        cafe.getLatitude().doubleValue(), cafe.getLongitude().doubleValue());
                }
                return cafeMapper.toSummaryResponse(cafe, distance);
            });
        }

        Page<Cafe> page = cafeRepository.searchCafes(trimmedQuery, trimmedNeighbourhood, CafeStatus.ACTIVE, pageable);
        return PageResponse.of(page, cafe -> cafeMapper.toSummaryResponse(cafe, null));
    }

    public AdminCafeDetailResponse createCafe(CreateCafeRequest request) {
        String trimmedName = request.name().trim();
        String trimmedAddress = request.address().trim();

        if (cafeRepository.existsByNameIgnoreCaseAndAddressIgnoreCaseAndArchivedAtIsNull(trimmedName, trimmedAddress)) {
            throw new ConflictException("Cafe with name '" + trimmedName + "' at address '" + trimmedAddress + "' already exists");
        }

        Cafe cafe = cafeMapper.toEntity(request);
        Cafe saved = cafeRepository.save(cafe);
        return cafeMapper.toAdminDetailResponse(saved, List.of());
    }

    public AdminCafeDetailResponse updateCafe(UUID id, UpdateCafeRequest request) {
        Cafe cafe = cafeRepository.findByIdAndArchivedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cafe not found with id: " + id));

        String trimmedName = request.name().trim();
        String trimmedAddress = request.address().trim();

        if (cafeRepository.existsByNameIgnoreCaseAndAddressIgnoreCaseAndIdNotAndArchivedAtIsNull(trimmedName, trimmedAddress, id)) {
            throw new ConflictException("Cafe with name '" + trimmedName + "' at address '" + trimmedAddress + "' already exists");
        }

        cafeMapper.updateEntity(cafe, request);
        Cafe updated = cafeRepository.save(cafe);
        List<DrinkResponse> drinks = drinkService.getActiveDrinksForCafe(id);
        return cafeMapper.toAdminDetailResponse(updated, drinks);
    }

    public AdminCafeDetailResponse updateCafeStatus(UUID id, UpdateCafeStatusRequest request) {
        Cafe cafe = cafeRepository.findByIdAndArchivedAtIsNull(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cafe not found with id: " + id));

        cafe.setStatus(request.status());
        if (request.status() == CafeStatus.ARCHIVED) {
            cafe.setArchivedAt(Instant.now());
        } else {
            cafe.setArchivedAt(null);
        }

        Cafe updated = cafeRepository.save(cafe);
        List<DrinkResponse> drinks = drinkService.getActiveDrinksForCafe(id);
        return cafeMapper.toAdminDetailResponse(updated, drinks);
    }

    private double calculateHaversineKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = R * c;
        return Math.round(distance * 100.0) / 100.0;
    }
}
