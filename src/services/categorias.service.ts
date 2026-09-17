import { supabase } from './supabase';

export async function seedCategoriasDefault(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc('seed_categorias_padrao', { p_user_id: user.id });
}
