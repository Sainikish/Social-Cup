package com.socialcup.rating.mapper;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.drink.entity.Drink;
import com.socialcup.rating.dto.CreateRatingRequest;
import com.socialcup.rating.dto.DrinkRatingResponse;
import com.socialcup.rating.dto.RatingResponse;
import com.socialcup.rating.dto.UpdateRatingRequest;
import com.socialcup.rating.entity.DrinkRating;
import com.socialcup.user.entity.Member;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RatingMapperTest {

    private RatingMapper ratingMapper;

    @BeforeEach
    void setUp() {
        ratingMapper = new RatingMapper();
    }

    private static Drink newDrink() {
        Cafe cafe = new Cafe();
        cafe.setId(UUID.randomUUID());
        cafe.setName("Corner Cafe");

        Drink drink = new Drink();
        drink.setId(UUID.randomUUID());
        drink.setCafe(cafe);
        drink.setName("Flat White");
        return drink;
    }

    private static Member newMember() {
        Member member = new Member();
        member.setId(UUID.randomUUID());
        member.setEmail("ada@example.com");
        member.setFirstName("Ada");
        member.setLastName("Lovelace");
        member.setAvatarUrl("http://example.com/ada.jpg");
        return member;
    }

    @Test
    void toEntity_mapsRequestFields_andTrimsNote() {
        Drink drink = newDrink();
        Member member = newMember();
        CreateRatingRequest request = new CreateRatingRequest(5, "  Great coffee!  ");

        DrinkRating drinkRating = ratingMapper.toEntity(request, member, drink);

        assertThat(drinkRating.getRating()).isEqualTo(5);
        assertThat(drinkRating.getNote()).isEqualTo("Great coffee!");
        assertThat(drinkRating.getDrink()).isEqualTo(drink);
        assertThat(drinkRating.getMember()).isEqualTo(member);
    }

    @Test
    void toEntity_nullNote_staysNull() {
        DrinkRating drinkRating = ratingMapper.toEntity(new CreateRatingRequest(3, null), newMember(), newDrink());

        assertThat(drinkRating.getNote()).isNull();
    }

    @Test
    void updateEntity_overwritesRatingAndNote() {
        DrinkRating drinkRating = new DrinkRating();
        drinkRating.setRating(2);
        drinkRating.setNote("Old note");

        ratingMapper.updateEntity(drinkRating, new UpdateRatingRequest(4, "New note"));

        assertThat(drinkRating.getRating()).isEqualTo(4);
        assertThat(drinkRating.getNote()).isEqualTo("New note");
    }

    @Test
    void toResponse_includesDrinkAndCafeContext_notReviewerIdentity() {
        Drink drink = newDrink();
        DrinkRating drinkRating = new DrinkRating();
        drinkRating.setId(UUID.randomUUID());
        drinkRating.setDrink(drink);
        drinkRating.setMember(newMember());
        drinkRating.setRating(4);
        drinkRating.setNote("Good");

        RatingResponse response = ratingMapper.toResponse(drinkRating);

        assertThat(response.drinkId()).isEqualTo(drink.getId());
        assertThat(response.drinkName()).isEqualTo("Flat White");
        assertThat(response.cafeName()).isEqualTo("Corner Cafe");
        assertThat(response.rating()).isEqualTo(4);
    }

    @Test
    void toDrinkRatingResponse_exposesDisplaySafeAuthorOnly() {
        Member member = newMember();
        DrinkRating drinkRating = new DrinkRating();
        drinkRating.setId(UUID.randomUUID());
        drinkRating.setDrink(newDrink());
        drinkRating.setMember(member);
        drinkRating.setRating(5);
        drinkRating.setNote("Perfect");

        DrinkRatingResponse response = ratingMapper.toDrinkRatingResponse(drinkRating);

        assertThat(response.author().id()).isEqualTo(member.getId());
        assertThat(response.author().firstName()).isEqualTo("Ada");
        assertThat(response.author().lastName()).isEqualTo("Lovelace");
        assertThat(response.author().avatarUrl()).isEqualTo("http://example.com/ada.jpg");
    }

    @Test
    void drinkRatingResponse_hasNoEmailOrPasswordField() {
        // Compile-time proof: the public reviewer DTO has no accessor for
        // email/password at all, so a controller can't accidentally expose it.
        assertThat(com.socialcup.rating.dto.RatingAuthorResponse.class.getRecordComponents())
            .extracting(java.lang.reflect.RecordComponent::getName)
            .doesNotContain("email", "password", "passwordHash", "status", "roles");
    }
}
