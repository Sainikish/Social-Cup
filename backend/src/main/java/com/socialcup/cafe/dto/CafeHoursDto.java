package com.socialcup.cafe.dto;

import com.socialcup.cafe.entity.CafeHours;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record CafeHoursDto(
    @NotNull(message = "Day of week is required")
    DayOfWeek dayOfWeek,

    LocalTime openTime,
    LocalTime closeTime,
    boolean isClosed
) {
    public static CafeHoursDto fromEntity(CafeHours hours) {
        return new CafeHoursDto(
            hours.dayOfWeek(),
            hours.openTime(),
            hours.closeTime(),
            hours.isClosed()
        );
    }
}
