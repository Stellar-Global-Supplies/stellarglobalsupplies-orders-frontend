-- ============================================================
-- Add tracking token for public order tracking
-- ============================================================

-- Add tracking_token column (UUID-based unique token for public access)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS orders_tracking_token_idx ON public.orders(tracking_token);

-- Update existing orders to have tracking tokens
UPDATE public.orders 
SET tracking_token = gen_random_uuid() 
WHERE tracking_token IS NULL;

-- Make tracking_token not nullable
ALTER TABLE public.orders 
ALTER COLUMN tracking_token SET NOT NULL;