-- Applied and verified on GameVolt production 2026-09-06 (unique=true, valid=true).
-- Apply before SDK 2026.09.06-1. Existing clients omit this nullable column
-- and continue to work. Retried outbox writes reuse one UUID and insert once.
BEGIN;
ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS client_submission_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS scores_client_submission_id_key
  ON public.scores (client_submission_id);
COMMIT;

-- Verification (read-only): the index must be unique and valid.
SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS type,
       i.indisunique, i.indisvalid
FROM pg_attribute a
JOIN pg_index i ON i.indrelid = a.attrelid AND a.attnum = ANY(i.indkey)
WHERE a.attrelid = 'public.scores'::regclass
  AND a.attname = 'client_submission_id'
  AND i.indexrelid = 'public.scores_client_submission_id_key'::regclass;
