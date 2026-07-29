-- Add invoice_uploaded_at column to track when invoice was uploaded
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_invoice_uploaded_at ON orders(invoice_uploaded_at);