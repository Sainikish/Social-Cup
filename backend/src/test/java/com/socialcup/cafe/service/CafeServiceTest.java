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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
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

    private CafeMapper cafeMapper;
    private CafeService cafeService;

    @BeforeEach
    void setUp() {
        cafeMapper = new CafeMapper(new ObjectMapper());
        cafeService = new CafeService(cafeRepository, cafeMapper, drinkService);
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
            new DrinkResponse(UUID.randomUUID(), id, "Artisan Brew", "Latte", "Coffee", "Hot", new BigDecimal("4.00"), 1, null, false, null, null, null)
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

        when(cafeRepository.findByIdAndArchivedAtIsNull(id)).thenReturn(Optional.of(cafe));
        when(cafeRepository.save(any(Cafe.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateCafeStatusRequest request = new UpdateCafeStatusRequest(CafeStatus.ARCHIVED);
        AdminCafeDetailResponse result = cafeService.updateCafeStatus(id, request);

        assertThat(result.status()).isEqualTo(CafeStatus.ARCHIVED);
        assertThat(cafe.getArchivedAt()).isNotNull();
    }
}
