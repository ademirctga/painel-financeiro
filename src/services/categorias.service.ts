import { supabase } from './supabase';

const CATEGORIAS_DEFAULT = [
  { nome: 'Cartão de Crédito', tipo: 'despesa', natureza: 'variavel', cor: '#6366f1' },
] as const;

export async function seedCategoriasDefault(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existentes } = await supabase
    .from('categorias')
    .select('nome, tipo')
    .eq('user_id', user.id);

  if (!existentes) return;

  const toCreate = CATEGORIAS_DEFAULT.filter(
    (c) => !existentes.some((e) => e.nome === c.nome && e.tipo === c.tipo)
  );

  if (toCreate.length === 0) return;

  await supabase.from('categorias').insert(
    toCreate.map((c) => ({ ...c, user_id: user.id }))
  );
}
