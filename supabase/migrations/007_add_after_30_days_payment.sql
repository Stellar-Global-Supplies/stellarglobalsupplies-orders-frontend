-- ============================================================
-- Add "After 30 days" to payment_status check constraint
-- ============================================================

-- Drop existing constraint
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

-- Add new constraint with "After 30 days" option
ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status = ANY (ARRAY['Pending'::text, 'Paid'::text, 'Partial'::text, 'After 30 days'::text]));