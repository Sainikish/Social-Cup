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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CafeServiceTest {

    @Mock
    private CafeRepository cafeRepository;

    @Mock
    private DrinkService drinkService;

    @Mock
    private PhotoStorageService photoStorageService;

    private CafeMapper cafeMapper;
    private CafeService cafeService;

    @BeforeEach
    void setUp() {
        cafeMapper = new CafeMapper(new ObjectMapper());
        cafeService = new CafeService(cafeRepository, cafeMapper, drinkService, photoStorageService);
    }

    @Test
    void getCafes_returnsPage() {
        Cafe cafe = new Cafe();
        cafe.setId(UUID.randomUUID());
        cafe.setName("Central Cafe");
        cafe.setAddress("100 Main St");
        cafe.setStatus(CafeStatus.ACTIVE);

        Pageable pageable = PageRequest.of(0, 10);
        when(cafeRepository.findAllByStatusAndArchivedAtIsNull(CafeStatus.ACTIVE, pageable))
            .thenReturn(new PageImpl<>(List.of(cafe), pageable, 1));

        PageResponse<CafeSummaryResponse> result = cafeService.getCafes(null, null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().getFirst().name()).isEqualTo("Central Cafe");
    }

    @Test
    void getCafeById_success() {
        UUID id = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(id);
        cafe.setName("Artisan Brew");
        cafe.setAddress("200 Broadway");
        cafe.setStatus(CafeStatus.ACTIVE);

        when(cafeRepository.findByIdAndArchivedAtIsNull(id)).thenReturn(Optional.of(cafe));
        when(drinkService.getActiveDrinksForCafe(id)).thenReturn(List.of(
            new DrinkResponse(UUID.randomUUID(), id, "Artisan Brew", "Latte", "Coffee", "Hot", new BigDecimal("4.00"), 1, null, false, null, null, null, null, 0L)
        ));

        CafeDetailResponse result = cafeService.getCafeById(id);

        assertThat(result.id()).isEqualTo(id);
        assertThat(result.name()).isEqualTo("Artisan Brew");
        assertThat(result.drinks()).hasSize(1);
    }

    @Test
    void getCafeById_notFound_throwsException() {
        UUID id = UUID.randomUUID();
        when(cafeRepository.findByIdAndArchivedAtIsNull(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cafeService.getCafeById(id))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Cafe not found");
    }

    @Test
    void searchCafes_withCoordinates_calculatesDistance() {
        Cafe cafe = new Cafe();
        cafe.setId(UUID.randomUUID());
        cafe.setName("Nearby Cafe");
        cafe.setAddress("300 Market St");
        cafe.setLatitude(new BigDecimal("40.7128"));
        cafe.setLongitude(new BigDecimal("-74.0060"));
        cafe.setStatus(CafeStatus.ACTIVE);

        Pageable pageable = PageRequest.of(0, 10);
        when(cafeRepository.findNearbyCafes(40.7128, -74.0060, null, "coffee", pageable))
            .thenReturn(new PageImpl<>(List.of(cafe), pageable, 1));

        PageResponse<CafeSummaryResponse> result = cafeService.searchCafes("coffee", null, 40.7128, -74.0060, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().getFirst().name()).isEqualTo("Nearby Cafe");
        assertThat(result.getContent().getFirst().distanceKm()).isNotNull();
    }

    @Test
    void createCafe_success() {
        CreateCafeRequest request = new CreateCafeRequest(
            "New Coffee Spot",
            "400 Elm St",
            "Midtown",
            new BigDecimal("40.7500"),
            new BigDecimal("-73.9800"),
            List.of(),
            "555-4321",
            "hello@newspot.com",
            null,
            new BigDecimal("0.8000"),
            false,
            "vibrant",
            "A nice place",
            List.of()
        );

        when(cafeRepository.existsByNameIgnoreCaseAndAddressIgnoreCaseAndArchivedAtIsNull("New Coffee Spot", "400 Elm St"))
            .thenReturn(false);
        when(cafeRepository.save(any(Cafe.class))).thenAnswer(invocation -> {
            Cafe c = invocation.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        AdminCafeDetailResponse response = cafeService.createCafe(request);

        assertThat(response).isNotNull();
        assertThat(response.name()).isEqualTo("New Coffee Spot");
        assertThat(response.payoutRate()).isEqualTo(new BigDecimal("0.8000"));
        verify(cafeRepository).save(any(Cafe.class));
    }

    @Test
    void createCafe_duplicate_throwsConflictException() {
        CreateCafeRequest request = new CreateCafeRequest(
            "Existing Cafe", "123 Main St", "Downtown", null, null, List.of(), null, null, null, null, false, null, null, List.of()
        );

        when(cafeRepository.existsByNameIgnoreCaseAndAddressIgnoreCaseAndArchivedAtIsNull("Existing Cafe", "123 Main St"))
            .thenReturn(true);

        assertThatThrownBy(() -> cafeService.createCafe(request))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("already exists");
    }

    @Test
    void updateCafeStatus_archived_setsArchivedAt() {
        UUID id = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(id);
        cafe.setName("To Archive");
        cafe.setStatus(CafeStatus.ACTIVE);

        when(cafeRepository.findById(id)).thenReturn(Optional.of(cafe));
        when(cafeRepository.save(any(Cafe.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateCafeStatusRequest request = new UpdateCafeStatusRequest(CafeStatus.ARCHIVED);
        AdminCafeDetailResponse result = cafeService.updateCafeStatus(id, request);

        assertThat(result.status()).isEqualTo(CafeStatus.ARCHIVED);
        assertThat(cafe.getArchivedAt()).isNotNull();
    }

    // Proves the fix: an already-archived cafe (archivedAt already set) must
    // still be findable by updateCafeStatus - using the archived-excluding
    // finder here would make archiving a cafe a one-way dead end with no
    // way back to ACTIVE, which is not how CafeStatusDialog on admin-web
    // presents this action (see CafeService.updateCafeStatus's own comment).
    @Test
    void updateCafeStatus_previouslyArchivedCafe_canBeReactivated() {
        UUID id = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(id);
        cafe.setName("Previously Archived");
        cafe.setStatus(CafeStatus.ARCHIVED);
        cafe.setArchivedAt(Instant.now());

        when(cafeRepository.findById(id)).thenReturn(Optional.of(cafe));
        when(cafeRepository.save(any(Cafe.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateCafeStatusRequest request = new UpdateCafeStatusRequest(CafeStatus.ACTIVE);
        AdminCafeDetailResponse result = cafeService.updateCafeStatus(id, request);

        assertThat(result.status()).isEqualTo(CafeStatus.ACTIVE);
        assertThat(cafe.getArchivedAt()).isNull();
    }

    // ---- Admin search / get-by-id ----

    @Test
    void getCafesForAdmin_delegatesToAdminSearchQuery_includingArchived() {
        Cafe cafe = new Cafe();
        cafe.setId(UUID.randomUUID());
        cafe.setName("Archived Cafe");
        cafe.setStatus(CafeStatus.ARCHIVED);
        cafe.setArchivedAt(Instant.now());

        Pageable pageable = PageRequest.of(0, 10);
        when(cafeRepository.searchCafesForAdmin("brew", CafeStatus.ARCHIVED, pageable))
            .thenReturn(new PageImpl<>(List.of(cafe), pageable, 1));

        PageResponse<CafeSummaryResponse> result = cafeService.getCafesForAdmin("brew", CafeStatus.ARCHIVED, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().getFirst().status()).isEqualTo(CafeStatus.ARCHIVED);
    }

    @Test
    void getCafeByIdForAdmin_archivedCafe_isFound() {
        UUID id = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(id);
        cafe.setName("Archived Cafe");
        cafe.setStatus(CafeStatus.ARCHIVED);
        cafe.setArchivedAt(Instant.now());

        when(cafeRepository.findById(id)).thenReturn(Optional.of(cafe));
        when(drinkService.getActiveDrinksForCafe(id)).thenReturn(List.of());

        AdminCafeDetailResponse result = cafeService.getCafeByIdForAdmin(id);

        assertThat(result.id()).isEqualTo(id);
        assertThat(result.status()).isEqualTo(CafeStatus.ARCHIVED);
    }

    @Test
    void getCafeByIdForAdmin_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(cafeRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cafeService.getCafeByIdForAdmin(id))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- Photos ----

    @Test
    void addPhoto_firstPhotoForCafe_isAutomaticallyPrimary() {
        UUID cafeId = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(cafeId);
        MultipartFile file = new MockMultipartFile("photo", "cafe.jpg", "image/jpeg", "bytes".getBytes());

        when(cafeRepository.findByIdAndArchivedAtIsNull(cafeId)).thenReturn(Optional.of(cafe));
        when(photoStorageService.uploadPhoto(eq(file), eq("cafes/" + cafeId))).thenReturn("https://example.com/photo.jpg");
        when(cafeRepository.save(any(Cafe.class))).thenAnswer(inv -> inv.getArgument(0));

        CafePhotoDto result = cafeService.addPhoto(cafeId, file);

        assertThat(result.photoUrl()).isEqualTo("https://example.com/photo.jpg");
        assertThat(result.isPrimary()).isTrue();
        assertThat(result.displayOrder()).isZero();
        assertThat(cafe.getPhotos()).hasSize(1);
    }

    @Test
    void addPhoto_secondPhotoForCafe_isNotPrimary_andAppendsDisplayOrder() {
        UUID cafeId = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(cafeId);
        cafe.addPhoto(new CafePhoto(cafe, "https://example.com/existing.jpg", null, 0, true));
        MultipartFile file = new MockMultipartFile("photo", "cafe2.jpg", "image/jpeg", "bytes".getBytes());

        when(cafeRepository.findByIdAndArchivedAtIsNull(cafeId)).thenReturn(Optional.of(cafe));
        when(photoStorageService.uploadPhoto(eq(file), eq("cafes/" + cafeId))).thenReturn("https://example.com/new.jpg");
        when(cafeRepository.save(any(Cafe.class))).thenAnswer(inv -> inv.getArgument(0));

        CafePhotoDto result = cafeService.addPhoto(cafeId, file);

        assertThat(result.isPrimary()).isFalse();
        assertThat(result.displayOrder()).isEqualTo(1);
        assertThat(cafe.getPhotos()).hasSize(2);
    }

    @Test
    void addPhoto_cafeNotFound_throwsResourceNotFoundException() {
        UUID cafeId = UUID.randomUUID();
        MultipartFile file = new MockMultipartFile("photo", "cafe.jpg", "image/jpeg", "bytes".getBytes());
        when(cafeRepository.findByIdAndArchivedAtIsNull(cafeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cafeService.addPhoto(cafeId, file))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void removePhoto_removingThePrimaryPhoto_promotesTheNextOne() {
        UUID cafeId = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(cafeId);
        CafePhoto primary = new CafePhoto(cafe, "https://example.com/primary.jpg", null, 0, true);
        CafePhoto secondary = new CafePhoto(cafe, "https://example.com/secondary.jpg", null, 1, false);
        cafe.addPhoto(primary);
        cafe.addPhoto(secondary);
        UUID primaryId = UUID.randomUUID();
        primary.setId(primaryId);

        when(cafeRepository.findByIdAndArchivedAtIsNull(cafeId)).thenReturn(Optional.of(cafe));
        when(cafeRepository.save(any(Cafe.class))).thenAnswer(inv -> inv.getArgument(0));

        cafeService.removePhoto(cafeId, primaryId);

        assertThat(cafe.getPhotos()).containsExactly(secondary);
        assertThat(secondary.isPrimary()).isTrue();
    }

    @Test
    void removePhoto_photoNotFound_throwsResourceNotFoundException() {
        UUID cafeId = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(cafeId);
        when(cafeRepository.findByIdAndArchivedAtIsNull(cafeId)).thenReturn(Optional.of(cafe));

        assertThatThrownBy(() -> cafeService.removePhoto(cafeId, UUID.randomUUID()))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
