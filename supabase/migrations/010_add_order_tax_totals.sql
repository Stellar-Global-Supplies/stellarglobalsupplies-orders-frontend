-- ============================================================
-- Stellar Global Supplies — OMS
-- Add CGST/SGST totals to orders table for quick display
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS cgst_total NUMERIC NOT NULL DEFAULT 0 CHECK (cgst_total >= 0),
  ADD COLUMN IF NOT EXISTS sgst_total NUMERIC NOT NULL DEFAULT 0 CHECK (sgst_total >= 0);

-- Update existing orders with totals from their items
UPDATE public.orders o
  SET 
    cgst_total = (SELECT COALESCE(SUM(oi.cgst), 0) FROM public.order_items oi WHERE oi.order_id = o.id),
    sgst_total = (SELECT COALESCE(SUM(oi.sgst), 0) FROM public.order_items oi WHERE oi.order_id = o.id)
  WHERE EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id);

COMMENT ON COLUMN public.orders.cgst_total IS 'Total CGST across all products';
COMMENT ON COLUMN public.orders.sgst_total IS 'Total SGST across all products';