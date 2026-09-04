package com.socialcup.cafe.dto;

import com.socialcup.cafe.entity.CafePhoto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CafePhotoDto(
    UUID id,

    @NotBlank(message = "Photo URL is required")
    @Size(max = 2048, message = "Photo URL must not exceed 2048 characters")
    String photoUrl,

    @Size(max = 255, message = "Caption must not exceed 255 characters")
    String caption,

    int displayOrder,
    boolean isPrimary
) {
    public static CafePhotoDto fromEntity(CafePhoto photo) {
        return new CafePhotoDto(
            photo.getId(),
            photo.getPhotoUrl(),
            photo.getCaption(),
            photo.getDisplayOrder(),
            photo.isPrimary()
        );
    }
}
