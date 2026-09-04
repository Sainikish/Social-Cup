package com.socialcup.rating.mapper;

import com.socialcup.drink.entity.Drink;
import com.socialcup.rating.dto.CreateRatingRequest;
import com.socialcup.rating.dto.DrinkRatingResponse;
import com.socialcup.rating.dto.RatingResponse;
import com.socialcup.rating.dto.UpdateRatingRequest;
import com.socialcup.rating.entity.DrinkRating;
import com.socialcup.user.entity.Member;
import org.springframework.stereotype.Component;

@Component
public class RatingMapper {

    public DrinkRating toEntity(CreateRatingRequest request, Member member, Drink drink) {
        DrinkRating drinkRating = new DrinkRating();
        drinkRating.setMember(member);
        drinkRating.setDrink(drink);
        drinkRating.setRating(request.rating());
        drinkRating.setNote(request.note() != null ? request.note().trim() : null);
        return drinkRating;
    }

    public void updateEntity(DrinkRating drinkRating, UpdateRatingRequest request) {
        drinkRating.setRating(request.rating());
        drinkRating.setNote(request.note() != null ? request.note().trim() : null);
    }

    public RatingResponse toResponse(DrinkRating drinkRating) {
        return RatingResponse.fromEntity(drinkRating);
    }

    public DrinkRatingResponse toDrinkRatingResponse(DrinkRating drinkRating) {
        return DrinkRatingResponse.fromEntity(drinkRating);
    }
}
