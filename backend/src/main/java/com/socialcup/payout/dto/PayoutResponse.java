package com.socialcup.payout.dto;

import com.socialcup.payout.entity.Payout;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PayoutResponse(
    UUID id,
    UUID cafeId,
    LocalDate periodStart,
    LocalDate periodEnd,
    int totalRedemptions,
    int totalCredits,
    BigDecimal amountOwed,
    BigDecimal amountPaid,
    String paymentReference,
    LocalDate paymentDate
) {
    public static PayoutResponse fromEntity(Payout payout) {
        return new PayoutResponse(
            payout.getId(),
            payout.getCafe().getId(),
            payout.getPeriodStart(),
            payout.getPeriodEnd(),
            payout.getTotalRedemptions(),
            payout.getTotalCredits(),
            payout.getAmountOwed(),
            payout.getAmountPaid(),
            payout.getPaymentReference(),
            payout.getPaymentDate()
        );
    }
}
