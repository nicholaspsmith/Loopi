-- Fix review_logs column types: integer -> real for FSRS decimal values
-- FSRS algorithm returns decimal values for stability, difficulty, and day counts
-- This migration is idempotent - safe to run multiple times

DO $$
BEGIN
  -- Only alter if columns are still integer type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_logs'
    AND column_name = 'stability'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE review_logs ALTER COLUMN stability TYPE real USING stability::real;
    ALTER TABLE review_logs ALTER COLUMN difficulty TYPE real USING difficulty::real;
    ALTER TABLE review_logs ALTER COLUMN elapsed_days TYPE real USING elapsed_days::real;
    ALTER TABLE review_logs ALTER COLUMN last_elapsed_days TYPE real USING last_elapsed_days::real;
    ALTER TABLE review_logs ALTER COLUMN scheduled_days TYPE real USING scheduled_days::real;
    RAISE NOTICE 'Migration applied: review_logs columns converted from integer to real';
  ELSE
    RAISE NOTICE 'Migration skipped: review_logs columns already real type';
  END IF;
END $$;
