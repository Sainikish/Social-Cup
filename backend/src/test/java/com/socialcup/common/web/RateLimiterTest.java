package com.socialcup.common.web;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimiterTest {

    private static class MutableClock extends Clock {
        private Instant instant;

        MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }

    @Test
    void allowsRequestsUpToTheLimit() {
        RateLimiter limiter = new RateLimiter(3, Duration.ofSeconds(60), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isFalse();
    }

    @Test
    void tracksKeysIndependently() {
        RateLimiter limiter = new RateLimiter(1, Duration.ofSeconds(60), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-b")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isFalse();
    }

    @Test
    void resetsAfterWindowElapses() {
        MutableClock clock = new MutableClock(Instant.EPOCH);
        RateLimiter limiter = new RateLimiter(2, Duration.ofSeconds(60), clock);

        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isFalse();

        clock.advance(Duration.ofSeconds(61));

        assertThat(limiter.tryAcquire("client-a")).isTrue();
    }

    @Test
    void remainingReflectsConsumedBudget() {
        RateLimiter limiter = new RateLimiter(5, Duration.ofSeconds(60), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

        assertThat(limiter.remaining("client-a")).isEqualTo(5);
        limiter.tryAcquire("client-a");
        limiter.tryAcquire("client-a");
        assertThat(limiter.remaining("client-a")).isEqualTo(3);
    }

}
