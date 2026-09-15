package com.socialcup.cafe.service;

import com.socialcup.cafe.dto.AdminCafeDetailResponse;
import com.socialcup.cafe.dto.CafeDetailResponse;
import com.socialcup.cafe.dto.CafePhotoDto;
import com.socialcup.cafe.dto.CafeSummaryResponse;
import com.socialcup.cafe.dto.CreateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeStatusRequest;
import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafePhoto;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.mapper.CafeMapper;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.dto.PageResponse;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.service.DrinkService;
import com.socialcup.storage.service.PhotoStorageService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class CafeService {

    private final CafeRepository cafeRepository;
    private final CafeMapper cafeMapper;
    private final DrinkService drinkService;
    private final PhotoStorageService photoStorageService;

    public CafeService(CafeRepository cafeRepository,
                       CafeMapper cafeMapper,
                       DrinkService drinkService,
                       PhotoStorageService photoStorageService) {
        this.cafeRepository = cafeRepository;
        this.cafeMapper = cafeMapper;
        this.drinkService = drinkService;
        this.photoStorageService = photoStorageService;
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

    // Admin search: any status, archived included - the admin equivalent of
    // getCafes/searchCafes above, which are both hardcoded to ACTIVE only
    // (public-facing). See CafeRepository.searchCafesForAdmin.
    @Transactional(readOnly = true)
    public PageResponse<CafeSummaryResponse> getCafesForAdmin(String searchQuery, CafeStatus status, Pageable pageable) {
        String trimmedQuery = searchQuery != null && !searchQuery.isBlank() ? searchQuery.trim() : null;
        Page<Cafe> page = cafeRepository.searchCafesForAdmin(trimmedQuery, status, pageable);
        return PageResponse.of(page, cafe -> cafeMapper.toSummaryResponse(cafe, null));
    }

    // Admin get-by-id: unfiltered findById, so an archived cafe (reachable
    // only through getCafesForAdmin above, never through the public search)
    // can still be opened and fully managed - see updateCafeStatus's own
    // comment on why archived must not be a dead end.
    @Transactional(readOnly = true)
    public AdminCafeDetailResponse getCafeByIdForAdmin(UUID id) {
        Cafe cafe = cafeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cafe not found with id: " + id));

        List<DrinkResponse> drinks = drinkService.getActiveDrinksForCafe(id);
        return cafeMapper.toAdminDetailResponse(cafe, drinks);
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
        // Unfiltered findById, not findByIdAndArchivedAtIsNull - an admin
        // must be able to edit an archived cafe's details too (see
        // updateCafeStatus below on why archived is not a dead end).
        Cafe cafe = cafeRepository.findById(id)
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
        // Unfiltered findById: archivedAt is set BY this very method when
        // requesting ARCHIVED (below) - using the archived-excluding finder
        // here would make archiving a cafe a one-way dead end, with no way
        // to ever find it again to set it back to ACTIVE/INACTIVE. Unlike
        // Member.deletedAt (a genuine, irreversible anonymization),
        // Cafe.archivedAt is just a "hidden from public listings" flag - see
        // CafeStatusDialog's own copy, which never claims archiving a cafe
        // is permanent (unlike the equivalent drink dialog, which does).
        Cafe cafe = cafeRepository.findById(id)
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

    // The first photo a cafe ever gets is automatically its primary one -
    // otherwise every cafe would start with photos but no primary, which
    // CafeMapper/admin-web both assume can't happen. Display order is
    // append-only here (max existing + 1); reordering isn't exposed yet.
    public CafePhotoDto addPhoto(UUID cafeId, MultipartFile photo) {
        Cafe cafe = cafeRepository.findByIdAndArchivedAtIsNull(cafeId)
            .orElseThrow(() -> new ResourceNotFoundException("Cafe not found with id: " + cafeId));

        String photoUrl = photoStorageService.uploadPhoto(photo, "cafes/" + cafeId);
        boolean isFirstPhoto = cafe.getPhotos().isEmpty();
        int nextDisplayOrder = cafe.getPhotos().stream()
            .mapToInt(CafePhoto::getDisplayOrder)
            .max()
            .orElse(-1) + 1;

        CafePhoto newPhoto = new CafePhoto(cafe, photoUrl, null, nextDisplayOrder, isFirstPhoto);
        cafe.addPhoto(newPhoto);
        cafeRepository.save(cafe);
        return CafePhotoDto.fromEntity(newPhoto);
    }

    // If the removed photo was the primary one, the next photo (by display
    // order) is promoted - a cafe with any photos at all must always have
    // exactly one primary, the same invariant addPhoto establishes.
    public void removePhoto(UUID cafeId, UUID photoId) {
        Cafe cafe = cafeRepository.findByIdAndArchivedAtIsNull(cafeId)
            .orElseThrow(() -> new ResourceNotFoundException("Cafe not found with id: " + cafeId));

        CafePhoto toRemove = cafe.getPhotos().stream()
            .filter(existing -> existing.getId().equals(photoId))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException(
                "Photo not found with id: " + photoId + " for cafe: " + cafeId));

        boolean wasPrimary = toRemove.isPrimary();
        cafe.removePhoto(toRemove);

        if (wasPrimary && !cafe.getPhotos().isEmpty()) {
            cafe.getPhotos().get(0).setPrimary(true);
        }

        cafeRepository.save(cafe);
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
