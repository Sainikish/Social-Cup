import { useEffect, useState } from 'react';

// Generic, not tied to search/cafes specifically - delays reflecting a
// fast-changing value (e.g. text input) until it's stopped changing for
// `delayMs`, so callers can key expensive work (like an API request) off
// the debounced value instead of firing on every keystroke.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debouncedValue;
}
