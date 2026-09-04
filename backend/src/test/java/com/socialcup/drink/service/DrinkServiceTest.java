package com.socialcup.drink.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.dto.PageResponse;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.drink.dto.CreateDrinkRequest;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.dto.UpdateDrinkRequest;
import com.socialcup.drink.dto.UpdateDrinkStatusRequest;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;
import com.socialcup.drink.mapper.DrinkMapper;
import com.socialcup.drink.repository.DrinkRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

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
class DrinkServiceTest {

    @Mock
    private DrinkRepository drinkRepository;

    @Mock
    private CafeRepository cafeRepository;

    private DrinkMapper drinkMapper;
    private DrinkService drinkService;

    @BeforeEach
    void setUp() {
        drinkMapper = new DrinkMapper();
        drinkService = new DrinkService(drinkRepository, cafeRepository, drinkMapper);
    }

    @Test
    void getDrinkById_success() {
        UUID id = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(UUID.randomUUID());
        cafe.setName("Cafe Test");

        Drink drink = new Drink();
        drink.setId(id);
        drink.setCafe(cafe);
        drink.setName("Cold Brew");
        drink.setRetailPrice(new BigDecimal("5.00"));
        drink.setCreditPrice(1);

        when(drinkRepository.findByIdAndArchivedAtIsNull(id)).thenReturn(Optional.of(drink));

        DrinkResponse response = drinkService.getDrinkById(id);

        assertThat(response.id()).isEqualTo(id);
        assertThat(response.name()).isEqualTo("Cold Brew");
        assertThat(response.cafeName()).isEqualTo("Cafe Test");
    }

    @Test
    void getDrinkById_notFound_throwsException() {
        UUID id = UUID.randomUUID();
        when(drinkRepository.findByIdAndArchivedAtIsNull(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> drinkService.getDrinkById(id))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Drink not found");
    }

    @Test
    void getSignatureDrinks_returnsSignatureDrinksOnly() {
        Drink drink = new Drink();
        drink.setId(UUID.randomUUID());
        drink.setName("Signature Mocha");
        drink.setSignature(true);
        drink.setStatus(DrinkStatus.ACTIVE);

        Pageable pageable = PageRequest.of(0, 10);
        when(drinkRepository.findAllBySignatureTrueAndStatusAndArchivedAtIsNull(DrinkStatus.ACTIVE, pageable))
            .thenReturn(new PageImpl<>(List.of(drink), pageable, 1));

        PageResponse<DrinkResponse> result = drinkService.getSignatureDrinks(pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().getFirst().name()).isEqualTo("Signature Mocha");
    }

    @Test
    void createDrink_success() {
        UUID cafeId = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(cafeId);
        cafe.setName("Cafe Roasters");

        CreateDrinkRequest request = new CreateDrinkRequest(
            "Nitro Cold Brew",
            "Cold Brew",
            "Smooth and creamy",
            new BigDecimal("5.50"),
            1,
            "http://example.com/nitro.jpg",
            true
        );

        when(cafeRepository.findByIdAndArchivedAtIsNull(cafeId)).thenReturn(Optional.of(cafe));
        when(drinkRepository.existsByCafeIdAndNameIgnoreCaseAndArchivedAtIsNull(cafeId, "Nitro Cold Brew"))
            .thenReturn(false);
        when(drinkRepository.save(any(Drink.class))).thenAnswer(inv -> {
            Drink d = inv.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        DrinkResponse response = drinkService.createDrink(cafeId, request);

        assertThat(response).isNotNull();
        assertThat(response.name()).isEqualTo("Nitro Cold Brew");
        assertThat(response.creditPrice()).isEqualTo(1);
        verify(drinkRepository).save(any(Drink.class));
    }

    @Test
    void createDrink_duplicateNameInSameCafe_throwsConflictException() {
        UUID cafeId = UUID.randomUUID();
        Cafe cafe = new Cafe();
        cafe.setId(cafeId);

        CreateDrinkRequest request = new CreateDrinkRequest(
            "Latte", "Coffee", null, new BigDecimal("4.00"), 1, null, false
        );

        when(cafeRepository.findByIdAndArchivedAtIsNull(cafeId)).thenReturn(Optional.of(cafe));
        when(drinkRepository.existsByCafeIdAndNameIgnoreCaseAndArchivedAtIsNull(cafeId, "Latte"))
            .thenReturn(true);

        assertThatThrownBy(() -> drinkService.createDrink(cafeId, request))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("already exists for this cafe");
    }

    @Test
    void updateDrinkStatus_archived_setsArchivedAt() {
        UUID id = UUID.randomUUID();
        Drink drink = new Drink();
        drink.setId(id);
        drink.setName("Seasonal Drink");
        drink.setStatus(DrinkStatus.ACTIVE);

        when(drinkRepository.findByIdAndArchivedAtIsNull(id)).thenReturn(Optional.of(drink));
        when(drinkRepository.save(any(Drink.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateDrinkStatusRequest request = new UpdateDrinkStatusRequest(DrinkStatus.ARCHIVED);
        DrinkResponse response = drinkService.updateDrinkStatus(id, request);

        assertThat(response.status()).isEqualTo(DrinkStatus.ARCHIVED);
        assertThat(drink.getArchivedAt()).isNotNull();
    }
}
