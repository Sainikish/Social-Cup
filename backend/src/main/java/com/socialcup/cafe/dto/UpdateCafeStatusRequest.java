package com.socialcup.cafe.dto;

import com.socialcup.cafe.entity.CafeStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateCafeStatusRequest(
    @NotNull(message = "Status is required")
    CafeStatus status
) {
}
