# Social Cup Backend

Coffee membership platform backend API built with Spring Boot 4.x, Java 21, PostgreSQL, and Stripe.

## Tech Stack

- **Java 21 LTS** - Long-term support JDK
- **Spring Boot 4.x** - Application framework
- **PostgreSQL 15** - Relational database
- **Flyway** - Database migration management
- **Spring Security** - Authentication & authorization with JWT
- **Spring Data JPA** - Data access layer with Hibernate
- **Stripe Java SDK** - Payment processing
- **AWS SDK for Java** - S3, SES, CloudWatch integration
- **JUnit 5 + Mockito + Testcontainers** - Testing framework

## Prerequisites

- Java 21+ JDK
- Maven 3.9+ — install with `choco install maven` (Windows), `brew install maven` (macOS),
  or `apt-get install maven` (Debian/Ubuntu). Verify with `mvn -version`.
- Docker & Docker Compose (for local PostgreSQL)

## Spring Boot 4 Notes

Non-obvious constraints in this stack. Breaking any of these fails silently or confusingly:

**Context path.** `server.servlet.context-path=/api` is applied by the servlet container,
so it is already stripped before requests reach Spring. Paths written *inside* the app —
Spring Security `requestMatchers`, `management.endpoints.web.base-path`, controller
`@RequestMapping` values — must **not** repeat `/api`. Externally the URL is
`/api/health`; internally the controller maps `/health`.

**Jackson 3.** Boot 4 ships Jackson 3 (`tools.jackson.*`), not Jackson 2
(`com.fasterxml.jackson.*`). Do not add Jackson 2 artifacts. Enum-keyed properties under
`spring.jackson.serialization.*` are not relaxed-bound and several Jackson 2 feature names
(e.g. `WRITE_DATES_AS_TIMESTAMPS`) no longer exist — configure a `JsonMapper` customizer
bean instead of using those property keys.

**Flyway needs an explicit starter, and let the BOM manage versions.** Boot 4 split
`FlywayAutoConfiguration` out of `spring-boot-autoconfigure` into its own artifact,
`spring-boot-flyway` — it is *not* pulled in transitively by `spring-boot-starter-data-jpa`
or by depending on `flyway-core` alone. Without it, Flyway never runs and nothing logs an
error: the app starts, JPA connects, and the schema is simply never created. All three of
`spring-boot-flyway`, `flyway-core`, and `flyway-database-postgresql` (required by Flyway
10+) must be present, versions unpinned so the parent BOM resolves them. Verified against a
real PostgreSQL 15 instance: `flyway_schema_history` is created and `V001` applies cleanly,
producing all 11 domain tables with their foreign keys and indexes intact.

## API Conventions

Cross-cutting infrastructure (error handling, auth foundation, pagination, rate limiting,
etc.) is in place ahead of any business modules. There is no login, Stripe, or redemption
endpoint yet — `/api/health` and the actuator health group are the only real routes.

### Success responses

Most endpoints return their resource directly. `ApiResponse<T>`
(`com.socialcup.common.dto.ApiResponse`) is available for endpoints that want an explicit
envelope (e.g. a bare acknowledgement with a message, or an action with no natural resource
to return) — used via `ApiResponse.success(data)`, `.success(data, message)`, or
`.message(message)`. `/health` and `/actuator/*` are deliberately unwrapped: they're
consumed by infra/monitoring tooling that expects a plain shape, not this app's envelope.

```json
{ "success": true, "data": { }, "message": null, "timestamp": "...", "requestId": "..." }
```

### Error responses

Every error, from any layer (validation, business rule, auth, unhandled), returns the same
`ApiError` shape. `fieldErrors` is present only for validation failures.

```json
{
  "timestamp": "2026-09-04T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "path": "/api/...",
  "requestId": "...",
  "fieldErrors": [{ "field": "email", "message": "must not be blank", "rejectedValue": "" }]
}
```

`code` is the stable, machine-readable identifier — match on this, not `message` or `status`
alone. Two are produced outside `GlobalExceptionHandler`, directly by the security filter
chain (`ApiErrorResponseWriter`), since exceptions thrown before `DispatcherServlet` never
reach a `@RestControllerAdvice`: `UNAUTHENTICATED` (401, `RestAuthenticationEntryPoint`),
`ACCESS_DENIED` (403, `RestAccessDeniedHandler`), and `RATE_LIMIT_EXCEEDED` (429,
`RateLimitFilter`). Everything else — `VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `CONFLICT`,
`NOT_FOUND` (unmatched route), `TYPE_MISMATCH`, `MALFORMED_REQUEST`, `METHOD_NOT_ALLOWED`,
`INTERNAL_ERROR`, plus whatever a business module raises via `SocialCupException` — comes
from `GlobalExceptionHandler`.

An unauthenticated request to *any* non-public path — including one that doesn't exist —
returns 401 `UNAUTHENTICATED`, not 404. Spring Security's `AuthorizationFilter` runs before
routing, so it never leaks which paths exist to a caller who hasn't proven who they are.

### Authentication & authorization (foundation only)

`JwtTokenProvider` issues and validates HS256 JWTs (access: 15 min, refresh: 30 days — both
configurable). `JwtAuthenticationFilter` reads a `Bearer` token if present and populates the
security context; a missing or invalid token is not rejected in the filter itself, it just
leaves the request anonymous, and `SecurityConfig`'s `authorizeHttpRequests` rules decide
from there. There is no `/auth/**` endpoint yet to issue tokens — `/auth/**` is reserved and
already public in `SecurityConfig`. `Roles` (`MEMBER`, `ADMIN`, `BARISTA`) are the constants
future `@PreAuthorize("hasRole(...)")` checks should use.

### Correlation IDs

Every response carries `X-Request-Id` (`RequestIdFilter`) — reused from the client's own
`X-Request-Id` request header when present, otherwise generated. It's in the log MDC for the
whole request (`%X{requestId}` in both console and file patterns) and echoed in every
`ApiError`/`ApiResponse` body, so a client-reported error, a log line, and the JSON response
can all be tied together.

### Rate limiting

Fixed-window counter, per client IP (`X-Forwarded-For` if present, else remote address),
applied globally via `RateLimitFilter`. Default 100 requests / 60s, configurable
(`app.rate-limit.*`) or disabled entirely (`app.rate-limit.enabled=false`). Every allowed
response carries `X-RateLimit-Remaining`; an exceeded request gets 429 with `Retry-After`.
Single-JVM only — a multi-instance deployment needs the same `tryAcquire` contract backed by
a shared store (Redis) instead of `RateLimiter`'s in-memory map.

### Pagination & sorting

Spring Data's native `Pageable` (`page`, `size`, `sort=field,asc|desc`, repeatable) is the
convention — no custom pagination parameter parsing. `PageResponse<T>`
(`com.socialcup.common.dto.PageResponse`) is the stable, Spring-Data-independent JSON
contract a paginated endpoint should return: `PageResponse.of(page)` or
`PageResponse.of(page, mapper)` to map entities to DTOs in the same step.
`spring.data.web.pageable.*` (default/max page size, 0- vs 1-indexed) is configured; the
property path was confirmed by inspecting the bound class
(`DataWebProperties`, `@ConfigurationProperties("spring.data.web")` — renamed from
`SpringDataWebProperties` in Boot 4, same prefix), but its actual effect on a `Pageable`
method argument is unverified end-to-end since there is no paginated endpoint yet to observe
it against.

### Filtering

`FilterParser.parse(rawFilter)` turns a `filter` query parameter into a
`List<FilterCriterion>`. Format: comma-separated `field:operator:value` triples, e.g.
`status:eq:ACTIVE,createdAt:gte:2024-01-01`. Operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`,
`like`, `in` (case-insensitive). Turning criteria into an actual query (JPA `Specification`
or otherwise) is left to whichever module first needs it — this only standardizes parsing
the wire format.

### API versioning

URI-based, reserved as `/v1` for the first business endpoints (`/api/v1/...` externally).
Health and actuator endpoints are deliberately unversioned — monitoring tooling shouldn't
need to track an API version to check liveness.

## Quick Start

### 1. Clone & Setup Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your local configuration
```

### 2. Start PostgreSQL

```bash
docker-compose up -d
```

Verify PostgreSQL is running:
```bash
docker-compose ps
```

Access pgAdmin at http://localhost:5050 (admin@socialcup.app / admin)

### 3. Build & Run Application

```bash
# Clean build
mvn clean package

# Run application with dev profile
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=dev"
```

Application starts at `http://localhost:8080/api`

### 4. Check Health

```bash
curl http://localhost:8080/api/health
```

Expected response:
```json
{
  "status": "UP",
  "service": "social-cup-backend"
}
```

## Project Structure

```
backend/
├── src/main/
│   ├── java/com/socialcup/
│   │   ├── SocialCupApplication.java
│   │   ├── config/               # SecurityConfig, WebConfig, JpaConfig, *Properties
│   │   ├── common/
│   │   │   ├── controller/        # HealthController
│   │   │   ├── dto/               # ApiResponse, ApiError, FieldViolation, PageResponse
│   │   │   ├── exception/         # GlobalExceptionHandler, SocialCupException and subtypes
│   │   │   └── web/               # RequestIdFilter, RateLimiter/Filter, FilterParser, ApiErrorResponseWriter
│   │   ├── security/              # JwtTokenProvider, JwtAuthenticationFilter, Roles, entry point/access denied handler
│   │   ├── auth/                  # Authentication module (not yet implemented)
│   │   ├── user/                # User/Member module
│   │   ├── cafe/                # Cafe module
│   │   ├── drink/               # Drink menu module
│   │   ├── rating/              # Drink rating module
│   │   ├── subscription/        # Stripe subscription module
│   │   ├── credit/              # Credit ledger module
│   │   ├── redemption/          # Redemption/QR code module
│   │   ├── payout/              # Payout reconciliation module
│   │   ├── admin/               # Admin panel APIs
│   │   └── barista/             # Barista scan page APIs
│   └── resources/
│       ├── application.yml      # Default configuration
│       ├── application-dev.yml  # Development profile
│       ├── application-test.yml # Test profile
│       └── db/migration/        # Flyway SQL migrations
├── src/test/
│   └── java/com/socialcup/      # Unit & integration tests
├── pom.xml                      # Maven configuration
├── docker-compose.yml           # Local PostgreSQL setup
└── README.md
```

## Configuration Profiles

### Development (default)
```bash
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=dev"
```

Uses local PostgreSQL, detailed logging, test Stripe keys.

### Test
```bash
mvn test
```

Uses Testcontainers PostgreSQL, minimal logging.

### Production
Set environment variables (see `.env.example`):
- `DATABASE_URL`
- `JWT_SECRET`
- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `AWS_*` credentials
- `SENTRY_*` configuration

## Database

### Migrations
Flyway automatically runs migrations on startup from `src/main/resources/db/migration/`.

Create new migration:
```bash
# Create V002__Add_new_table.sql in src/main/resources/db/migration/
# Follow naming: V{version}__{description}.sql
```

### Schema Inspection

Connect to PostgreSQL:
```bash
docker exec -it socialcup-postgres psql -U socialcup -d socialcup_dev
```

Common queries:
```sql
-- List tables
\dt

-- Describe table
\d member

-- List indexes
\di

-- Show current schema
SELECT * FROM information_schema.tables WHERE table_schema = 'public';
```

## API Endpoints

No business endpoints exist yet — see [Next Steps](#next-steps).

### Health Check
```
GET /api/health
```

### Actuator (Monitoring)
```
GET /api/actuator/health              # Detailed health
GET /api/actuator/health/liveness     # Liveness probe
GET /api/actuator/health/readiness    # Readiness probe
GET /api/actuator/info                # Application info
GET /api/actuator/metrics             # Application metrics
```

## Testing

### Run All Tests
```bash
mvn test
```

### Run Specific Test Class
```bash
mvn test -Dtest=HealthControllerTest
```

### Test Layers

- **Unit** (`RequestIdFilterTest`, `RateLimiterTest`, `FilterParserTest`, `PageResponseTest`,
  `JwtTokenProviderTest`, `ApiResponseTest`) — no Spring context, run in milliseconds.
- **`@WebMvcTest` slice** (`HealthControllerTest`, `GlobalExceptionHandlerIntegrationTest`) —
  one controller plus its explicit `@Import`s; no database.
- **Full `@SpringBootTest`** (`SecurityIntegrationTest`, `RateLimitIntegrationTest`) — real
  embedded Tomcat, real filter chain, real actuator endpoints. Since no `@Entity` exists yet,
  these activate the `no-persistence` Spring profile (see `JpaConfig`) and exclude
  datasource/JPA/Flyway autoconfiguration, rather than requiring a live database purely to
  test the web/security layer. Once a business module adds persistence, its own full-context
  tests should drop `no-persistence` and rely on Testcontainers instead (see below).

### Integration Tests with Testcontainers
`application-test.yml`'s default datasource URL (`jdbc:tc:postgresql:15://...`) is a
Testcontainers JDBC URL: on first real connection it launches a PostgreSQL container via
Docker automatically. This needs Docker running wherever these tests execute; it has not
been exercised yet since no test currently needs real persistence.

## Build

### Clean Build
```bash
mvn clean package
```

### Skip Tests
```bash
mvn package -DskipTests
```

### Build Docker Image
```bash
# Ensure JAR is built first
mvn clean package

# Build image
docker build -t socialcup-backend:latest .
```

## Security

- **JWT**: HS256, access tokens (15 min) + refresh tokens (30 days), both configurable
  (`app.security.jwt.*`). The signing key is SHA-256 of the configured secret, not the raw
  bytes — so a short `JWT_SECRET` still produces a valid HMAC key length.
- **Password**: BCrypt hashing (cost 12)
- **HTTPS**: Enforced in production
- **CORS**: Configured per environment (`app.cors.allowed-origins`), not hardcoded
- **Rate limiting**: 100 req/60s per IP by default (`app.rate-limit.*`)
- **Errors**: Never leak stack traces or internal details — see [API Conventions](#api-conventions)
- **Secrets**: Use environment variables (never commit secrets)

## Logging

Logs are written to:
- Console: Development environment
- File: `logs/social-cup.log`

Every line carries `[%X{requestId}]` from `RequestIdFilter`'s MDC entry, so log lines for one
request — across whichever classes touch it — can be grepped out together.

Log levels by profile:
- **Development**: DEBUG
- **Test**: INFO
- **Production**: INFO (or WARN)

## Common Issues

### PostgreSQL Connection Refused
```bash
# Verify container is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart
docker-compose down
docker-compose up -d
```

### Flyway Migration Failed
```bash
# Check migration files in src/main/resources/db/migration/
# Ensure naming: V{version}__{description}.sql

# Baseline existing database (if needed)
mvn flyway:baseline -Dspring.profiles.active=dev
```

### Build Failure on Java Version
Ensure Java 21 is installed and set as default:
```bash
java -version
# Should show: openjdk version "21.x.x" or later
```

## Development Workflow

1. Create feature branch: `git checkout -b feature/module-name`
2. Make changes to relevant module package
3. Write unit tests
4. Run: `mvn clean test`
5. Run integration tests: `mvn verify`
6. Build: `mvn clean package`
7. Test locally: `mvn spring-boot:run`
8. Commit & push

## Next Steps

Cross-cutting infrastructure (error handling, request/response conventions, auth
foundation, rate limiting, correlation IDs, actuator probes) is done — see
[API Conventions](#api-conventions). Still open:

- Implement the `/auth/**` endpoints (signup, login, OAuth2, token refresh) that actually
  issue the JWTs `JwtTokenProvider` already knows how to create and validate
- Implement user management module (first real `@Entity`/`@Repository` — re-enable
  Testcontainers-backed integration tests once one exists)
- Implement cafe management module
- Configure Stripe webhook handling
- Configure AWS SDK clients

## Support

For issues or questions, refer to:
- Architecture documentation: `../docs/ARCHITECTURE.md`
- API specification: `../docs/API_SPEC.md`
- Database schema: `../docs/DATABASE_SCHEMA.md`
