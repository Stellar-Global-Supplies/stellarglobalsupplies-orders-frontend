-- Migration: 005_add_invoice_s3_key.sql
-- Adds invoice_s3_key column so the Lambda can re-fetch the file
-- without parsing the pre-signed URL (which changes on each generation).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS invoice_s3_key TEXT;

COMMENT ON COLUMN orders.invoice_s3_key IS
  'S3 object key for the uploaded invoice (e.g. invoices/{orderId}/{ts}_filename.pdf). '
  'Used to re-generate pre-signed URLs after expiry and to attach the file to emails.';
