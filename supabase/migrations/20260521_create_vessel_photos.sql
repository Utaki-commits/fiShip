-- Phase 1: vessel_photos table.
-- New additive table for vessel interior/exterior photos.

CREATE TABLE IF NOT EXISTS vessel_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id uuid NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vessel_photos_vessel_sort_idx
  ON vessel_photos(vessel_id, sort_order);

ALTER TABLE vessel_photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vessel_photos'
      AND policyname = 'vessel_owner_select'
  ) THEN
    CREATE POLICY "vessel_owner_select"
      ON vessel_photos FOR SELECT
      USING (vessel_id IN (SELECT id FROM vessels WHERE user_id = auth.uid()::text));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vessel_photos'
      AND policyname = 'vessel_owner_insert'
  ) THEN
    CREATE POLICY "vessel_owner_insert"
      ON vessel_photos FOR INSERT
      WITH CHECK (vessel_id IN (SELECT id FROM vessels WHERE user_id = auth.uid()::text));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vessel_photos'
      AND policyname = 'vessel_owner_delete'
  ) THEN
    CREATE POLICY "vessel_owner_delete"
      ON vessel_photos FOR DELETE
      USING (vessel_id IN (SELECT id FROM vessels WHERE user_id = auth.uid()::text));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vessel_photos'
      AND policyname = 'vessel_owner_update'
  ) THEN
    CREATE POLICY "vessel_owner_update"
      ON vessel_photos FOR UPDATE
      USING (vessel_id IN (SELECT id FROM vessels WHERE user_id = auth.uid()::text));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vessel_photos'
      AND policyname = 'public_select'
  ) THEN
    CREATE POLICY "public_select"
      ON vessel_photos FOR SELECT
      USING (true);
  END IF;
END $$;

GRANT SELECT ON vessel_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON vessel_photos TO authenticated;
