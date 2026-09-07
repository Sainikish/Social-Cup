package com.socialcup.barista.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

// The cafe id identifies which cafe terminal is authenticating; the PIN is
// the actual secret being verified. Deliberately no member/user id anywhere
// here - a barista authenticates as a cafe, not as a person.
public record BaristaLoginRequest(
    @NotNull(message = "Cafe ID is required")
    UUID cafeId,

    @NotBlank(message = "PIN is required")
    String pin
) {
}
