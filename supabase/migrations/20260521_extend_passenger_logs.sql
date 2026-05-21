-- Phase 1: passenger_logs table extension.
-- Safe for existing data: only ADD COLUMN IF NOT EXISTS.

ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS address text DEFAULT '';

ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS age integer;

ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS emergency_contact text DEFAULT '';

ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS emergency_contact_relation text DEFAULT '';

ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS agreed_to_terms boolean NOT NULL DEFAULT false;

ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS agreed_at timestamptz;

ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';

ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);

ALTER TABLE passenger_logs
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id);

