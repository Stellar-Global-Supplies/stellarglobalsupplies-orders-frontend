-- ============================================================
-- Stellar Global Supplies — OMS
-- Multi-product support: order_items table
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Order items table for multi-product support
CREATE TABLE IF NOT EXISTS public.order_items (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID         NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_type  TEXT         NOT NULL,
  material      TEXT         NOT NULL,
  quantity      NUMERIC      NOT NULL CHECK (quantity > 0),
  unit          TEXT         NOT NULL DEFAULT 'Pieces' CHECK (unit IN ('Pieces', 'Kgs')),
  unit_cost     NUMERIC      NOT NULL CHECK (unit_cost >= 0),
  sale_cost     NUMERIC      NOT NULL CHECK (sale_cost >= 0),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);

-- RLS: only authenticated users can access order items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all order items
CREATE POLICY "Authenticated users can read order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert order items
CREATE POLICY "Authenticated users can create order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update order items
CREATE POLICY "Authenticated users can update order items"
  ON public.order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
 
-- Authenticated users can delete order items
CREATE POLICY "Authenticated users can delete order items"
  ON public.order_items FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON TABLE public.order_items IS 'Individual products within an order for multi-product support';