package com.socialcup.barista.dto;

import java.util.UUID;

// The plaintext PIN is returned exactly once, here, at the moment it's
// generated - it is never stored or logged anywhere except as pinHash
// (see CafePin), matching the same "shown once" convention as any
// credential-reset flow. The caller (admin-web) must display it and never
// persist it client-side beyond that.
public record CafePinResetResponse(UUID cafeId, String pin) {
}
