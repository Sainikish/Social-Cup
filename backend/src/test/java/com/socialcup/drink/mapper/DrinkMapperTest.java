package com.socialcup.drink.mapper;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.drink.dto.CreateDrinkRequest;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.dto.DrinkSummaryResponse;
import com.socialcup.drink.dto.UpdateDrinkRequest;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DrinkMapperTest {

    private DrinkMapper drinkMapper;

    @BeforeEach
    void setUp() {
        drinkMapper = new DrinkMapper();
    }

    @Test
    void toResponse_and_toSummaryResponse_mapsCorrectly() {
        Cafe cafe = new Cafe();
        cafe.setId(UUID.randomUUID());
        cafe.setName("Espresso Lab");

        Drink drink = new Drink();
        drink.setId(UUID.randomUUID());
        drink.setCafe(cafe);
        drink.setName("Flat White");
        drink.setType("Coffee");
        drink.setDescription("Smooth espresso with microfoam");
        drink.setRetailPrice(new BigDecimal("4.50"));
        drink.setCreditPrice(1);
        drink.setPhotoUrl("http://example.com/flatwhite.jpg");
        drink.setSignature(true);
        drink.setStatus(DrinkStatus.ACTIVE);

        DrinkResponse response = drinkMapper.toResponse(drink);
        assertThat(response.id()).isEqualTo(drink.getId());
        assertThat(response.cafeId()).isEqualTo(cafe.getId());
        assertThat(response.cafeName()).isEqualTo("Espresso Lab");
        assertThat(response.name()).isEqualTo("Flat White");
        assertThat(response.creditPrice()).isEqualTo(1);
        assertThat(response.signature()).isTrue();

        DrinkSummaryResponse summary = drinkMapper.toSummaryResponse(drink);
        assertThat(summary.id()).isEqualTo(drink.getId());
        assertThat(summary.name()).isEqualTo("Flat White");
        assertThat(summary.creditPrice()).isEqualTo(1);
    }

    @Test
    void toEntity_and_updateEntity_worksProperly() {
        Cafe cafe = new Cafe();
        cafe.setId(UUID.randomUUID());

        CreateDrinkRequest createReq = new CreateDrinkRequest(
            "Cortado",
            "Espresso",
            "Equal parts espresso and steamed milk",
            new BigDecimal("4.00"),
            1,
            "http://example.com/cortado.jpg",
            false
        );

        Drink drink = drinkMapper.toEntity(createReq, cafe);
        assertThat(drink.getName()).isEqualTo("Cortado");
        assertThat(drink.getRetailPrice()).isEqualTo(new BigDecimal("4.00"));
        assertThat(drink.getCreditPrice()).isEqualTo(1);
        assertThat(drink.getCafe()).isEqualTo(cafe);
        assertThat(drink.getStatus()).isEqualTo(DrinkStatus.ACTIVE);

        UpdateDrinkRequest updateReq = new UpdateDrinkRequest(
            "Cortado Deluxe",
            "Specialty",
            "With oat milk",
            new BigDecimal("4.50"),
            1,
            "http://example.com/cortado2.jpg",
            true
        );

        drinkMapper.updateEntity(drink, updateReq);
        assertThat(drink.getName()).isEqualTo("Cortado Deluxe");
        assertThat(drink.getType()).isEqualTo("Specialty");
        assertThat(drink.isSignature()).isTrue();
    }
}
