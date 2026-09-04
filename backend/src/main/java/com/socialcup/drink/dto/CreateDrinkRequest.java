package com.socialcup.drink.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateDrinkRequest(
    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    String name,

    @Size(max = 100, message = "Type must not exceed 100 characters")
    String type,

    String description,

    @NotNull(message = "Retail price is required")
    @DecimalMin(value = "0.01", message = "Retail price must be positive")
    BigDecimal retailPrice,

    @Min(value = 1, message = "Credit price must be at least 1")
    int creditPrice,

    @Size(max = 2048, message = "Photo URL must not exceed 2048 characters")
    String photoUrl,

    Boolean signature
) {
}
