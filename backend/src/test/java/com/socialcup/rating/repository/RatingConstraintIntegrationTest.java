package com.socialcup.rating.repository;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.rating.entity.DrinkRating;
import com.socialcup.user.entity.Member;
import com.socialcup.user.repository.MemberRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Exercises the `rating` table's constraints directly against a real
// PostgreSQL instance: the pre-existing (V001) unique(member_id, drink_id)
// index that this phase relies on rather than an application-only duplicate
// check, and the V006-hardened ON DELETE behavior on its two foreign keys.
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RatingConstraintIntegrationTest {

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

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private RatingRepository ratingRepository;

    @Test
    void duplicateRatingForSameMemberAndDrink_violatesUniqueConstraint() {
        Member member = memberRepository.saveAndFlush(newMember("ada@example.com"));
        Cafe cafe = cafeRepository.saveAndFlush(newCafe());
        Drink drink = drinkRepository.saveAndFlush(newDrink(cafe));
        ratingRepository.saveAndFlush(newRating(member, drink, 5, "First rating"));

        DrinkRating duplicate = newRating(member, drink, 3, "Trying to rate again");

        assertThatThrownBy(() -> ratingRepository.saveAndFlush(duplicate))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void sameMemberRatingDifferentDrinks_isAllowed() {
        Member member = memberRepository.saveAndFlush(newMember("ada@example.com"));
        Cafe cafe = cafeRepository.saveAndFlush(newCafe());
        Drink drinkA = drinkRepository.saveAndFlush(newDrink(cafe));
        Drink drinkB = drinkRepository.saveAndFlush(newDrink(cafe));

        ratingRepository.saveAndFlush(newRating(member, drinkA, 5, null));
        ratingRepository.saveAndFlush(newRating(member, drinkB, 4, null));
        // No exception: uniqueness is scoped per (member, drink) pair.
    }

    @Test
    void differentMembersRatingSameDrink_isAllowed() {
        Member memberA = memberRepository.saveAndFlush(newMember("ada@example.com"));
        Member memberB = memberRepository.saveAndFlush(newMember("grace@example.com"));
        Cafe cafe = cafeRepository.saveAndFlush(newCafe());
        Drink drink = drinkRepository.saveAndFlush(newDrink(cafe));

        ratingRepository.saveAndFlush(newRating(memberA, drink, 5, null));
        ratingRepository.saveAndFlush(newRating(memberB, drink, 2, null));
        // No exception: uniqueness is per member, not global per drink.
    }

    @Test
    void hardDeletingDrinkWithRatings_isRestricted() {
        Member member = memberRepository.saveAndFlush(newMember("ada@example.com"));
        Cafe cafe = cafeRepository.saveAndFlush(newCafe());
        Drink drink = drinkRepository.saveAndFlush(newDrink(cafe));
        ratingRepository.saveAndFlush(newRating(member, drink, 5, null));

        // V006 hardened drink_id to ON DELETE RESTRICT specifically so a hard
        // delete of a drink cannot silently wipe every member's rating of it.
        assertThatThrownBy(() -> {
            drinkRepository.delete(drink);
            drinkRepository.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void hardDeletingMemberWithRatings_cascadesToTheirOwnRatingsOnly() {
        Member memberA = memberRepository.saveAndFlush(newMember("ada@example.com"));
        Member memberB = memberRepository.saveAndFlush(newMember("grace@example.com"));
        Cafe cafe = cafeRepository.saveAndFlush(newCafe());
        Drink drink = drinkRepository.saveAndFlush(newDrink(cafe));
        ratingRepository.saveAndFlush(newRating(memberA, drink, 5, null));
        DrinkRating memberBRating = ratingRepository.saveAndFlush(newRating(memberB, drink, 2, null));

        // member_id intentionally keeps ON DELETE CASCADE: a member's own
        // ratings are their own data and are expected to go with them.
        memberRepository.delete(memberA);
        memberRepository.flush();

        assertThat(ratingRepository.existsByMemberIdAndDrinkId(memberA.getId(), drink.getId())).isFalse();
        assertThat(ratingRepository.findById(memberBRating.getId())).isPresent();
    }

    private static Cafe newCafe() {
        Cafe cafe = new Cafe();
        cafe.setName("Blue Bottle Coffee");
        cafe.setAddress("300 Main St");
        return cafe;
    }

    private static Drink newDrink(Cafe cafe) {
        Drink drink = new Drink();
        drink.setCafe(cafe);
        drink.setName("Cortado");
        drink.setCreditPrice(1);
        return drink;
    }

    private static Member newMember(String email) {
        Member member = new Member();
        member.setEmail(email);
        member.setFirstName("Ada");
        return member;
    }

    private static DrinkRating newRating(Member member, Drink drink, int stars, String note) {
        DrinkRating rating = new DrinkRating();
        rating.setMember(member);
        rating.setDrink(drink);
        rating.setRating(stars);
        rating.setNote(note);
        return rating;
    }
}
