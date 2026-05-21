-- Phase 1: contacts table extension.
-- Safe for existing data: only ADD COLUMN IF NOT EXISTS.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS is_charter boolean NOT NULL DEFAULT false;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS is_negotiating boolean NOT NULL DEFAULT false;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS preferred_date date;

