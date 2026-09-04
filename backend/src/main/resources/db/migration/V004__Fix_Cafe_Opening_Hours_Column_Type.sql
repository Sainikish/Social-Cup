-- Cafe.openingHours is mapped as a plain Java String (the mapper serializes/deserializes
-- the whole list via Jackson; nothing anywhere runs JSONB-specific SQL against this column).
-- With the column as jsonb, Hibernate's JDBC binding sends a String parameter typed as
-- varchar, which PostgreSQL rejects for a jsonb column ("column is of type jsonb but
-- expression is of type character varying") on every INSERT/UPDATE that touches it -
-- including when the value is NULL. Aligning the column type with actual usage fixes both
-- the runtime bind failure and schema validation.
ALTER TABLE cafe ALTER COLUMN opening_hours TYPE TEXT USING opening_hours::TEXT;
