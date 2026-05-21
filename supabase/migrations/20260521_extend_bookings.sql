-- Phase 1: bookings table extension.
-- Safe for existing data: only ADD COLUMN IF NOT EXISTS.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS board_token text;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS board_completed boolean NOT NULL DEFAULT false;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS board_completed_at timestamptz;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS needs_call boolean NOT NULL DEFAULT false;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS needs_call_reason text DEFAULT '';

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS call_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);

