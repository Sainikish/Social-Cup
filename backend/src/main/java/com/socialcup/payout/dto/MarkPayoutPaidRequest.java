package com.socialcup.payout.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MarkPayoutPaidRequest(
    @NotNull(message = "Amount paid is required")
    @DecimalMin(value = "0.0", message = "Amount paid must not be negative")
    BigDecimal amountPaid,

    @NotBlank(message = "Payment reference is required")
    @Size(max = 255, message = "Payment reference must not exceed 255 characters")
    String paymentReference,

    @NotNull(message = "Payment date is required")
    LocalDate paymentDate
) {
}
