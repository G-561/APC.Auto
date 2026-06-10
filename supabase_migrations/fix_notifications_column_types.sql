-- Fix notifications column types
-- listing_id was uuid but listings.id is bigint
-- wanted_part_id was uuid but wanted_parts.id is integer
-- Existing rows are unaffected (both columns were null — inserts were failing)

ALTER TABLE notifications
  DROP COLUMN IF EXISTS listing_id,
  DROP COLUMN IF EXISTS wanted_part_id;

ALTER TABLE notifications
  ADD COLUMN listing_id     bigint,
  ADD COLUMN wanted_part_id integer;
