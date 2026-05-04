ALTER TABLE vessels ADD COLUMN IF NOT EXISTS max_bookings_per_customer integer DEFAULT 5;
