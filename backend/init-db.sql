-- Runs once on first container start, after POSTGRES_DB (socialcup_dev) is created.
-- No explicit LOCALE/LC_* here: the postgres:15-alpine image is musl-based and does not
-- carry glibc locales such as en_US.UTF-8, which would make CREATE DATABASE fail.

-- Used when running without an explicit profile (application.yml default).
CREATE DATABASE socialcup;

-- Used by integration tests that point at a local database instead of Testcontainers.
CREATE DATABASE socialcup_test;

GRANT ALL PRIVILEGES ON DATABASE socialcup_dev TO socialcup;
GRANT ALL PRIVILEGES ON DATABASE socialcup TO socialcup;
GRANT ALL PRIVILEGES ON DATABASE socialcup_test TO socialcup;

\c socialcup_dev
GRANT ALL ON SCHEMA public TO socialcup;

\c socialcup
GRANT ALL ON SCHEMA public TO socialcup;

\c socialcup_test
GRANT ALL ON SCHEMA public TO socialcup;
