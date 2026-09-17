import { supabase } from './supabase';
import type { Lancamento } from '@/types/financeiro';

const CATEGORIA_NOME = 'Dinheiro Extra';
const CATEGORIA_COR  = '#f59e0b';

// Retorna o id da categoria "Dinheiro Extra", criando se não existir
export async function getOrCreateCategoriaDinheiroExtra(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from('categorias')
    .select('id')
    .eq('user_id', user.id)
    .eq('nome', CATEGORIA_NOME)
    .eq('tipo', 'receita')
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created } = await supabase
    .from('categorias')
    .insert({ user_id: user.id, nome: CATEGORIA_NOME, tipo: 'receita', natureza: 'variavel', cor: CATEGORIA_COR })
    .select('id')
    .single();

  return (created?.id as string) ?? null;
}

export interface DinheiroExtraItem {
  id: string;
  descricao: string;
  valor: number;
  dataCompetencia: string;
  status: string;
}

export async function fetchDinheiroExtra(inicio: string, fim: string): Promise<DinheiroExtraItem[]> {
  const categoriaId = await getOrCreateCategoriaDinheiroExtra();
  if (!categoriaId) return [];

  const { data, error } = await supabase
    .from('lancamentos')
    .select('id, descricao, valor, data_competencia, status')
    .eq('categoria_id', categoriaId)
    .eq('tipo', 'receita')
    .gte('data_competencia', inicio)
    .lte('data_competencia', fim)
    .is('deleted_at', null)
    .order('data_competencia', { ascending: false });

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id: r.id,
    descricao: r.descricao,
    valor: Number(r.valor),
    dataCompetencia: r.data_competencia,
    status: r.status,
  }));
}

export async function inserirDinheiroExtra(
  valor: number,
  descricao: string,
  dataCompetencia: string,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const categoriaId = await getOrCreateCategoriaDinheiroExtra();
  if (!categoriaId) return false;

  const { error } = await supabase.from('lancamentos').insert({
    user_id: user.id,
    tipo: 'receita',
    descricao: descricao || CATEGORIA_NOME,
    valor,
    data_competencia: dataCompetencia,
    data_pagamento: dataCompetencia,
    status: 'pago',
    categoria_id: categoriaId,
  });

  return !error;
}

export async function excluirDinheiroExtraItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('lancamentos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}
