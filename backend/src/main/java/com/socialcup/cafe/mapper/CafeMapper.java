package com.socialcup.cafe.mapper;

import com.socialcup.cafe.dto.AdminCafeDetailResponse;
import com.socialcup.cafe.dto.CafeDetailResponse;
import com.socialcup.cafe.dto.CafeHoursDto;
import com.socialcup.cafe.dto.CafePhotoDto;
import com.socialcup.cafe.dto.CafeSummaryResponse;
import com.socialcup.cafe.dto.CreateCafeRequest;
import com.socialcup.cafe.dto.UpdateCafeRequest;
import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafePhoto;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.drink.dto.DrinkResponse;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.List;

@Component
public class CafeMapper {

    private final ObjectMapper objectMapper;

    public CafeMapper(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public CafeSummaryResponse toSummaryResponse(Cafe cafe, Double distanceKm) {
        String primaryPhotoUrl = null;
        if (cafe.getPhotos() != null && !cafe.getPhotos().isEmpty()) {
            primaryPhotoUrl = cafe.getPhotos().stream()
                .filter(CafePhoto::isPrimary)
                .map(CafePhoto::getPhotoUrl)
                .findFirst()
                .orElse(cafe.getPhotos().getFirst().getPhotoUrl());
        }

        return new CafeSummaryResponse(
            cafe.getId(),
            cafe.getName(),
            cafe.getAddress(),
            cafe.getNeighbourhood(),
            cafe.getLatitude(),
            cafe.getLongitude(),
            cafe.isFeatured(),
            cafe.getStatus(),
            cafe.getVibeTags(),
            primaryPhotoUrl,
            distanceKm
        );
    }

    public CafeDetailResponse toDetailResponse(Cafe cafe, List<DrinkResponse> drinks) {
        List<CafeHoursDto> hours = parseHours(cafe.getOpeningHours());
        List<CafePhotoDto> photos = mapPhotos(cafe);

        return new CafeDetailResponse(
            cafe.getId(),
            cafe.getName(),
            cafe.getAddress(),
            cafe.getNeighbourhood(),
            cafe.getLatitude(),
            cafe.getLongitude(),
            hours,
            cafe.getPhoneNumber(),
            cafe.getEmail(),
            cafe.getWebsite(),
            cafe.isFeatured(),
            cafe.getVibeTags(),
            cafe.getDescription(),
            cafe.getStatus(),
            photos,
            drinks != null ? drinks : Collections.emptyList(),
            cafe.getCreatedAt(),
            cafe.getUpdatedAt()
        );
    }

    // Admin-only counterpart of toDetailResponse: same fields, plus payoutRate.
    // Used solely by the /admin/cafes write endpoints - never by the public CafeController.
    public AdminCafeDetailResponse toAdminDetailResponse(Cafe cafe, List<DrinkResponse> drinks) {
        List<CafeHoursDto> hours = parseHours(cafe.getOpeningHours());
        List<CafePhotoDto> photos = mapPhotos(cafe);

        return new AdminCafeDetailResponse(
            cafe.getId(),
            cafe.getName(),
            cafe.getAddress(),
            cafe.getNeighbourhood(),
            cafe.getLatitude(),
            cafe.getLongitude(),
            hours,
            cafe.getPhoneNumber(),
            cafe.getEmail(),
            cafe.getWebsite(),
            cafe.getPayoutRate(),
            cafe.isFeatured(),
            cafe.getVibeTags(),
            cafe.getDescription(),
            cafe.getStatus(),
            photos,
            drinks != null ? drinks : Collections.emptyList(),
            cafe.getCreatedAt(),
            cafe.getUpdatedAt()
        );
    }

    private List<CafePhotoDto> mapPhotos(Cafe cafe) {
        return cafe.getPhotos() == null ? Collections.emptyList()
            : cafe.getPhotos().stream().map(CafePhotoDto::fromEntity).toList();
    }

    public Cafe toEntity(CreateCafeRequest request) {
        Cafe cafe = new Cafe();
        cafe.setName(request.name().trim());
        cafe.setAddress(request.address().trim());
        cafe.setNeighbourhood(request.neighbourhood() != null ? request.neighbourhood().trim() : null);
        cafe.setLatitude(request.latitude());
        cafe.setLongitude(request.longitude());
        cafe.setOpeningHours(serializeHours(request.openingHours()));
        cafe.setPhoneNumber(request.phoneNumber() != null ? request.phoneNumber().trim() : null);
        cafe.setEmail(request.email() != null ? request.email().trim().toLowerCase() : null);
        cafe.setWebsite(request.website() != null ? request.website().trim() : null);
        if (request.payoutRate() != null) {
            cafe.setPayoutRate(request.payoutRate());
        }
        cafe.setFeatured(request.featured() != null && request.featured());
        cafe.setVibeTags(request.vibeTags() != null ? request.vibeTags().trim() : null);
        cafe.setDescription(request.description() != null ? request.description().trim() : null);
        cafe.setStatus(CafeStatus.ACTIVE);

        if (request.photos() != null) {
            for (CafePhotoDto photoDto : request.photos()) {
                cafe.addPhoto(new CafePhoto(cafe, photoDto.photoUrl(), photoDto.caption(), photoDto.displayOrder(), photoDto.isPrimary()));
            }
        }

        return cafe;
    }

    public void updateEntity(Cafe cafe, UpdateCafeRequest request) {
        cafe.setName(request.name().trim());
        cafe.setAddress(request.address().trim());
        cafe.setNeighbourhood(request.neighbourhood() != null ? request.neighbourhood().trim() : null);
        cafe.setLatitude(request.latitude());
        cafe.setLongitude(request.longitude());
        cafe.setOpeningHours(serializeHours(request.openingHours()));
        cafe.setPhoneNumber(request.phoneNumber() != null ? request.phoneNumber().trim() : null);
        cafe.setEmail(request.email() != null ? request.email().trim().toLowerCase() : null);
        cafe.setWebsite(request.website() != null ? request.website().trim() : null);
        if (request.payoutRate() != null) {
            cafe.setPayoutRate(request.payoutRate());
        }
        if (request.featured() != null) {
            cafe.setFeatured(request.featured());
        }
        cafe.setVibeTags(request.vibeTags() != null ? request.vibeTags().trim() : null);
        cafe.setDescription(request.description() != null ? request.description().trim() : null);

        if (request.photos() != null) {
            cafe.getPhotos().clear();
            for (CafePhotoDto photoDto : request.photos()) {
                cafe.addPhoto(new CafePhoto(cafe, photoDto.photoUrl(), photoDto.caption(), photoDto.displayOrder(), photoDto.isPrimary()));
            }
        }
    }

    public List<CafeHoursDto> parseHours(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<CafeHoursDto>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public String serializeHours(List<CafeHoursDto> hours) {
        if (hours == null || hours.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(hours);
        } catch (Exception e) {
            return null;
        }
    }
}
