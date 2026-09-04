Technical Debt

1. Testcontainers integration test requires Docker.
   Status: Environment limitation.
   CI should execute with Docker available.

2. cafe_photo.is_primary uniqueness.
   Status: Business decision pending.

3. DrinkMapper.toSummaryResponse().
   Status: Existing unused code; intentionally retained.

4. Testcontainers tests should be executed in CI.