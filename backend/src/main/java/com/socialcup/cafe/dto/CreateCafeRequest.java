package com.socialcup.cafe.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record CreateCafeRequest(
    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    String name,

    @NotBlank(message = "Address is required")
    @Size(max = 500, message = "Address must not exceed 500 characters")
    String address,

    @Size(max = 255, message = "Neighbourhood must not exceed 255 characters")
    String neighbourhood,

    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    BigDecimal latitude,

    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    BigDecimal longitude,

    @Valid
    List<CafeHoursDto> openingHours,

    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    String phoneNumber,

    @Email(message = "Invalid email format")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    String email,

    @Size(max = 2048, message = "Website URL must not exceed 2048 characters")
    String website,

    @DecimalMin(value = "0.0", message = "Payout rate must be between 0.0 and 1.0")
    @DecimalMax(value = "1.0", message = "Payout rate must be between 0.0 and 1.0")
    BigDecimal payoutRate,

    Boolean featured,

    @Size(max = 500, message = "Vibe tags must not exceed 500 characters")
    String vibeTags,

    String description,

    @Valid
    List<CafePhotoDto> photos
) {
}
