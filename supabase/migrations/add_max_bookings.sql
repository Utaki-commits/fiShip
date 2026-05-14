ALTER TABLE vessels
  ADD COLUMN IF NOT EXISTS max_bookings_per_customer integer NOT NULL DEFAULT 5;
