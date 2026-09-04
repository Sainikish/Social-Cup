package com.socialcup.cafe.repository;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.repository.DrinkRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Exercises the V005 unique indexes directly against a real PostgreSQL instance,
// bypassing CafeService/DrinkService's own existsBy... pre-checks (already covered
// by CafeServiceTest/DrinkServiceTest) to prove the database-level safety net
// those checks rely on for the race-condition case actually exists and works.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CafeDrinkUniquenessConstraintIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private CafeRepository cafeRepository;

    @Autowired
    private DrinkRepository drinkRepository;

    @Test
    void duplicateCafeNameAndAddressViolatesUniqueIndex() {
        cafeRepository.saveAndFlush(newCafe("Blue Bottle Coffee", "300 Main St"));

        // Different case on both fields: the index is on LOWER(name), LOWER(address),
        // matching CafeRepository's ...IgnoreCase... semantics exactly.
        Cafe duplicate = newCafe("BLUE BOTTLE COFFEE", "300 MAIN ST");

        assertThatThrownBy(() -> cafeRepository.saveAndFlush(duplicate))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void sameNameAtDifferentAddressIsAllowed() {
        cafeRepository.saveAndFlush(newCafe("Blue Bottle Coffee", "300 Main St"));

        Cafe sameNameDifferentAddress = newCafe("Blue Bottle Coffee", "1 Other Ave");

        cafeRepository.saveAndFlush(sameNameDifferentAddress);
        // No exception: name alone is not the unique key, (name, address) together is.
    }

    @Test
    void duplicateDrinkNameWithinSameCafeViolatesUniqueIndex() {
        Cafe cafe = cafeRepository.saveAndFlush(newCafe("Corner Cafe", "55 Elm St"));
        drinkRepository.saveAndFlush(newDrink(cafe, "Cortado"));

        Drink duplicate = newDrink(cafe, "CORTADO");

        assertThatThrownBy(() -> drinkRepository.saveAndFlush(duplicate))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void sameDrinkNameAtDifferentCafeIsAllowed() {
        Cafe cafeA = cafeRepository.saveAndFlush(newCafe("Cafe A", "1 First St"));
        Cafe cafeB = cafeRepository.saveAndFlush(newCafe("Cafe B", "2 Second St"));
        drinkRepository.saveAndFlush(newDrink(cafeA, "Cortado"));

        drinkRepository.saveAndFlush(newDrink(cafeB, "Cortado"));
        // No exception: uniqueness is scoped per cafe_id, not global.
    }

    private static Cafe newCafe(String name, String address) {
        Cafe cafe = new Cafe();
        cafe.setName(name);
        cafe.setAddress(address);
        return cafe;
    }

    private static Drink newDrink(Cafe cafe, String name) {
        Drink drink = new Drink();
        drink.setCafe(cafe);
        drink.setName(name);
        drink.setCreditPrice(1);
        return drink;
    }
}
