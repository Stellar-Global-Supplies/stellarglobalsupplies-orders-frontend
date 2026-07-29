-- ============================================================
-- Stellar Global Supplies — OMS
-- Supabase SQL Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name     TEXT         NOT NULL,
  phone             TEXT         NOT NULL,
  email             TEXT         NOT NULL,
  product_type      TEXT         NOT NULL,   -- from top_sku view (skus column)
  material          TEXT         NOT NULL,   -- from material_spilt view (material_type column)
  quantity          NUMERIC      NOT NULL CHECK (quantity > 0),
  unit              TEXT         NOT NULL DEFAULT 'Pieces' CHECK (unit IN ('Pieces', 'Kgs')),
  sale_cost         NUMERIC      NOT NULL CHECK (sale_cost >= 0),
  payment_status    TEXT         NOT NULL DEFAULT 'Pending'
                                CHECK (payment_status IN ('Pending', 'Paid', 'Partial')),
  delivery_timeline DATE,
  status            TEXT         NOT NULL DEFAULT 'Order Received'
                                CHECK (status IN ('Order Received','Processing','Ready to Dispatch','Delivered')),
  created_by        UUID         REFERENCES auth.users(id),
  updated_by        UUID         REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS orders_status_idx      ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_email_idx       ON public.orders(email);
CREATE INDEX IF NOT EXISTS orders_created_at_idx  ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_by_idx  ON public.orders(created_by);

-- RLS: only authenticated users can access orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all orders
CREATE POLICY "Authenticated users can read orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert orders
CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update orders
CREATE POLICY "Authenticated users can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role (Lambda) bypasses RLS automatically
-- No additional policy needed for service role

COMMENT ON TABLE public.orders IS 'Stellar Global Supplies — Customer orders managed via OMS';
