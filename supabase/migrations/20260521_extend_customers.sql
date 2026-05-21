-- Phase 1: customers table extension.
-- Safe for existing data: only ADD COLUMN IF NOT EXISTS.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS address text DEFAULT '';

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS age integer;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS emergency_contact text DEFAULT '';

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS emergency_contact_relation text DEFAULT '';

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_blacklisted boolean NOT NULL DEFAULT false;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS memo text DEFAULT '';

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS vessel_id uuid REFERENCES vessels(id);

