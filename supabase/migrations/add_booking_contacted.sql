ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contacted boolean not null default false;
