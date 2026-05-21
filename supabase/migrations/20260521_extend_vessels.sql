-- Phase 1: vessels table extension.
-- Safe for existing data: only ADD COLUMN IF NOT EXISTS and additive JSONB defaults.

ALTER TABLE vessels
  ADD COLUMN IF NOT EXISTS vip_threshold integer NOT NULL DEFAULT 3;

ALTER TABLE vessels
  ADD COLUMN IF NOT EXISTS facilities jsonb DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vessels'
      AND column_name = 'metal_light'
  ) THEN
    EXECUTE $sql$
      UPDATE vessels
      SET facilities = COALESCE(facilities, '{}'::jsonb)
        || jsonb_build_object(
          'searchlight_type',
          CASE WHEN metal_light THEN 'metal_halide' ELSE 'none' END
        )
      WHERE NOT COALESCE(facilities, '{}'::jsonb) ? 'searchlight_type'
    $sql$;
  END IF;
END $$;

UPDATE vessels
SET facilities = COALESCE(facilities, '{}'::jsonb)
  || jsonb_build_object(
    'electric_reel_power', COALESCE((facilities->>'electric_reel_power')::boolean, false),
    'air_conditioner', COALESCE((facilities->>'air_conditioner')::boolean, false),
    'fish_finder', COALESCE(facilities->'fish_finder', '{"enabled": false, "makers": []}'::jsonb),
    'searchlight_type',
      COALESCE(
        facilities->>'searchlight_type',
        CASE
          WHEN facilities ? 'metal_light' AND (facilities->>'metal_light')::boolean THEN 'metal_halide'
          ELSE 'none'
        END
      ),
    'life_jacket_rental', COALESCE(facilities->>'life_jacket_rental', 'none'),
    'life_jacket_rental_price', COALESCE(facilities->>'life_jacket_rental_price', ''),
    'rod_keeper', COALESCE((facilities->>'rod_keeper')::boolean, false),
    'tanken_maru', COALESCE((facilities->>'tanken_maru')::boolean, false),
    'custom_facilities', COALESCE(facilities->'custom_facilities', '[]'::jsonb)
  )
WHERE facilities IS NULL
   OR NOT facilities ? 'electric_reel_power'
   OR NOT facilities ? 'air_conditioner'
   OR NOT facilities ? 'fish_finder'
   OR NOT facilities ? 'searchlight_type'
   OR NOT facilities ? 'life_jacket_rental'
   OR NOT facilities ? 'life_jacket_rental_price'
   OR NOT facilities ? 'tanken_maru'
   OR NOT facilities ? 'custom_facilities';
