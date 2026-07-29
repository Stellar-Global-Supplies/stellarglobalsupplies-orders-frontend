import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

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
