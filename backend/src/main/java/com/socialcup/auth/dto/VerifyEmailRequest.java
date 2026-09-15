package com.socialcup.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyEmailRequest(
    @NotBlank(message = "Code is required")
    String code
) {
}
