package com.socialcup.cafe.entity;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record CafeHours(
    DayOfWeek dayOfWeek,
    LocalTime openTime,
    LocalTime closeTime,
    boolean isClosed
) {
}
