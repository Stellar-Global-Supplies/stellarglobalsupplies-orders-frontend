import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Track missing env vars so we can show a helpful error in the UI
// instead of crashing with a white screen at module load time.
export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Missing Supabase environment variables. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your environment.'
    : null;

// Create a stub client if env vars are missing so imports don't crash.
// Real API calls will fail gracefully and show the config error instead.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Fetch product types from top_skus VIEW — column: sku
export const fetchProductTypes = async () => {
  const { data, error } = await supabase
    .from('top_skus')
    .select('sku')
    .order('sku');
  if (error) throw error;
  return data?.map((r) => r.sku).filter(Boolean) ?? [];
};

// Fetch materials from material_split VIEW — column: material_type
export const fetchMaterials = async () => {
  const { data, error } = await supabase
    .from('material_split')
    .select('material_type')
    .order('material_type');
  if (error) throw error;
  return data?.map((r) => r.material_type).filter(Boolean) ?? [];
};

// Fetch distinct customers (name, phone, email) from orders — used to
// power the "existing customer" lookup on New Order. We pull the most
// recent orders and dedupe by customer_name client-side, keeping the
// latest contact details for each name.
export const fetchCustomers = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('customer_name, phone, email, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const seen = new Map();
  for (const row of data ?? []) {
    const name = row.customer_name?.trim();
    if (!name || seen.has(name)) continue;
    seen.set(name, {
      customer_name: name,
      phone: row.phone ?? '',
      email: row.email ?? '',
    });
  }
  return Array.from(seen.values());
};
