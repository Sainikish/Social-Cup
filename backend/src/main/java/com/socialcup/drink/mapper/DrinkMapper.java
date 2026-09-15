package com.socialcup.drink.mapper;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.drink.dto.CreateDrinkRequest;
import com.socialcup.drink.dto.DrinkResponse;
import com.socialcup.drink.dto.DrinkSummaryResponse;
import com.socialcup.drink.dto.UpdateDrinkRequest;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;
import org.springframework.stereotype.Component;

@Component
public class DrinkMapper {

    // averageRating/ratingCount are supplied by the caller (DrinkService),
    // resolved from a separate batched RatingRepository aggregate query rather
    // than derived here - this mapper only ever shapes the entity's own
    // columns, and a drink has no rating columns of its own.
    public DrinkResponse toResponse(Drink drink, Double averageRating, long ratingCount) {
        return DrinkResponse.fromEntity(drink, averageRating, ratingCount);
    }

    public DrinkSummaryResponse toSummaryResponse(Drink drink, Double averageRating, long ratingCount) {
        return DrinkSummaryResponse.fromEntity(drink, averageRating, ratingCount);
    }

    public Drink toEntity(CreateDrinkRequest request, Cafe cafe) {
        Drink drink = new Drink();
        drink.setCafe(cafe);
        drink.setName(request.name().trim());
        drink.setType(request.type() != null ? request.type().trim() : null);
        drink.setDescription(request.description() != null ? request.description().trim() : null);
        drink.setRetailPrice(request.retailPrice());
        drink.setCreditPrice(request.creditPrice());
        drink.setPhotoUrl(request.photoUrl() != null ? request.photoUrl().trim() : null);
        drink.setSignature(request.signature() != null && request.signature());
        drink.setStatus(DrinkStatus.ACTIVE);
        return drink;
    }

    public void updateEntity(Drink drink, UpdateDrinkRequest request) {
        drink.setName(request.name().trim());
        drink.setType(request.type() != null ? request.type().trim() : null);
        drink.setDescription(request.description() != null ? request.description().trim() : null);
        drink.setRetailPrice(request.retailPrice());
        drink.setCreditPrice(request.creditPrice());
        drink.setPhotoUrl(request.photoUrl() != null ? request.photoUrl().trim() : null);
        if (request.signature() != null) {
            drink.setSignature(request.signature());
        }
    }
}
