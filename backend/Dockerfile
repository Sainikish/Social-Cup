FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /build

# Resolve dependencies first so this layer caches independently of source changes.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=builder /build/target/social-cup-backend-*.jar app.jar

EXPOSE 8080

# /api prefix comes from server.servlet.context-path
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
