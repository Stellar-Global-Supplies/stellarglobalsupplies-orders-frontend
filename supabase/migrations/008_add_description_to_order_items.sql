-- ============================================================
-- Stellar Global Supplies — OMS
-- Add optional description field to order_items
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Add description column to order_items (optional field)
ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment
COMMENT ON COLUMN public.order_items.description IS 'Optional description for the product in this order';