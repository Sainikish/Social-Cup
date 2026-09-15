// Client-side pre-checks only - the backend is the actual source of truth
// (see backend LoginRequest/RegisterRequest). These mirror those exact
// constraints so a user gets instant feedback instead of a round trip for
// an error the client could already see coming.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Email is required';
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Enter a valid email address';
  }
  return undefined;
}

// Mirrors LoginRequest.password: @NotBlank only, no length constraint - the
// backend doesn't know a login attempt's password length is "wrong", only
// whether it matches the stored hash.
export function validateRequiredPassword(password: string): string | undefined {
  if (!password) {
    return 'Password is required';
  }
  return undefined;
}

// Mirrors RegisterRequest.password: @NotBlank + @Size(min = 8). Also reused
// for ResetPasswordRequest.newPassword, which mirrors the exact same rule.
export function validateNewPassword(password: string): string | undefined {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  return undefined;
}

// Mirrors VerifyEmailRequest.code / ResetPasswordRequest.code: @NotBlank
// only - the backend is the sole judge of whether a code is well-formed or
// correct, this just catches an empty submission before a round trip.
export function validateVerificationCode(code: string): string | undefined {
  if (!code.trim()) {
    return 'Code is required';
  }
  return undefined;
}
