package com.socialcup.drink.dto;

import com.socialcup.drink.entity.DrinkStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateDrinkStatusRequest(
    @NotNull(message = "Status is required")
    DrinkStatus status
) {
}
