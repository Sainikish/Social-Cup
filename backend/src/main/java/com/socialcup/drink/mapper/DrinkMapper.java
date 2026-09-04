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

    public DrinkResponse toResponse(Drink drink) {
        return DrinkResponse.fromEntity(drink);
    }

    public DrinkSummaryResponse toSummaryResponse(Drink drink) {
        return DrinkSummaryResponse.fromEntity(drink);
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
