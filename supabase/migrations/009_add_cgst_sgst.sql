-- ============================================================
-- Stellar Global Supplies — OMS
-- Add CGST and SGST fields to order_items
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Add CGST and SGST columns
ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS cgst NUMERIC NOT NULL DEFAULT 0 CHECK (cgst >= 0),
  ADD COLUMN IF NOT EXISTS sgst NUMERIC NOT NULL DEFAULT 0 CHECK (sgst >= 0);

-- Update existing records to calculate CGST and SGST (9% each of sale_cost)
UPDATE public.order_items
  SET cgst = ROUND(sale_cost * 0.09, 2),
      sgst = ROUND(sale_cost * 0.09, 2)
  WHERE cgst = 0 AND sgst = 0;

COMMENT ON COLUMN public.order_items.cgst IS 'Central GST (9% of sale_cost)';
COMMENT ON COLUMN public.order_items.sgst IS 'State GST (9% of sale_cost)';