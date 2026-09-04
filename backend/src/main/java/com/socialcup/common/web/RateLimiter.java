package com.socialcup.common.web;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Fixed-window request counter, per key. Single-JVM only: a multi-instance
 * deployment needs a shared store (e.g. Redis) behind the same {@code tryAcquire}
 * contract.
 */
public class RateLimiter {

    private record Window(Instant start, int count) {
    }

    private final int maxRequests;
    private final Duration windowSize;
    private final Clock clock;
    private final ConcurrentHashMap<String, AtomicReference<Window>> windows = new ConcurrentHashMap<>();

    public RateLimiter(int maxRequests, Duration windowSize, Clock clock) {
        this.maxRequests = maxRequests;
        this.windowSize = windowSize;
        this.clock = clock;
    }

    public boolean tryAcquire(String key) {
        Instant now = clock.instant();
        AtomicReference<Window> ref = windows.computeIfAbsent(key, k -> new AtomicReference<>(new Window(now, 0)));
        while (true) {
            Window current = ref.get();
            Window next;
            if (Duration.between(current.start(), now).compareTo(windowSize) >= 0) {
                next = new Window(now, 1);
            } else if (current.count() >= maxRequests) {
                return false;
            } else {
                next = new Window(current.start(), current.count() + 1);
            }
            if (ref.compareAndSet(current, next)) {
                return true;
            }
        }
    }

    public int remaining(String key) {
        AtomicReference<Window> ref = windows.get(key);
        if (ref == null) {
            return maxRequests;
        }
        Window current = ref.get();
        Instant now = clock.instant();
        if (Duration.between(current.start(), now).compareTo(windowSize) >= 0) {
            return maxRequests;
        }
        return Math.max(0, maxRequests - current.count());
    }

}
