-- Add invoice_url column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_invoice_url ON orders(invoice_url);