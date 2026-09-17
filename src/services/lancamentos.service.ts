import { supabase } from './supabase';

export interface LancamentoInput {
  tipo: 'despesa' | 'receita';
  descricao: string;
  valor: number;
  dataCompetencia: string;
  dataPagamento?: string | null;
  status: 'previsto' | 'pago' | 'atrasado' | 'cancelado';
  categoriaId?: string | null;
  metodoId?: string | null;
  centroCustoId?: string | null;
  fornecedorId?: string | null;
  observacao?: string | null;
}

export type InsertResult = { id: string } | { error: string };

function traduzirErro(msg: string): string {
  if (msg.includes('row-level security') || msg.includes('permission denied') || msg.includes('403'))
    return 'Sem permissão para salvar. Tente sair e entrar novamente.';
  if (msg.includes('violates not-null') || msg.includes('null value'))
    return 'Campo obrigatório faltando. Verifique os dados.';
  if (msg.includes('duplicate key') || msg.includes('unique constraint'))
    return 'Registro duplicado.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Erro de conexão. Verifique sua internet.';
  return 'Erro ao salvar lançamento. Tente novamente.';
}

export async function inserirLancamento(input: LancamentoInput): Promise<InsertResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' };

  const { data, error } = await supabase
    .from('lancamentos')
    .insert({
      user_id: user.id,
      tipo: input.tipo,
      descricao: input.descricao,
      valor: input.valor,
      data_competencia: input.dataCompetencia,
      data_pagamento: input.dataPagamento ?? null,
      status: input.status,
      categoria_id: input.categoriaId ?? null,
      metodo_id: input.metodoId ?? null,
      centro_custo_id: input.centroCustoId ?? null,
      fornecedor_id: input.fornecedorId ?? null,
      observacao: input.observacao ?? null,
    })
    .select('id')
    .single();

  if (error || !data) return { error: traduzirErro(error?.message ?? '') };
  return { id: data.id as string };
}

export async function atualizarLancamento(
  id: string,
  input: Partial<LancamentoInput>
): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  if (input.tipo !== undefined)            patch.tipo = input.tipo;
  if (input.descricao !== undefined)       patch.descricao = input.descricao;
  if (input.valor !== undefined)           patch.valor = input.valor;
  if (input.dataCompetencia !== undefined) patch.data_competencia = input.dataCompetencia;
  if ('dataPagamento' in input)            patch.data_pagamento = input.dataPagamento ?? null;
  if (input.status !== undefined)          patch.status = input.status;
  if ('categoriaId' in input)              patch.categoria_id = input.categoriaId ?? null;
  if ('metodoId' in input)                 patch.metodo_id = input.metodoId ?? null;
  if ('centroCustoId' in input)            patch.centro_custo_id = input.centroCustoId ?? null;
  if ('fornecedorId' in input)             patch.fornecedor_id = input.fornecedorId ?? null;
  if ('observacao' in input)               patch.observacao = input.observacao ?? null;

  const { error } = await supabase.from('lancamentos').update(patch).eq('id', id);
  return !error;
}

export async function excluirLancamento(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('lancamentos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function restaurarLancamento(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('lancamentos')
    .update({ deleted_at: null })
    .eq('id', id);
  return !error;
}

export interface LancamentoExcluido {
  id: string;
  tipo: 'despesa' | 'receita';
  descricao: string;
  valor: number;
  dataCompetencia: string;
  deletedAt: string;
}

export async function fetchLancamentosExcluidos(): Promise<LancamentoExcluido[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('lancamentos')
    .select('id, tipo, descricao, valor, data_competencia, deleted_at')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(200);

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id: r.id,
    tipo: r.tipo as 'despesa' | 'receita',
    descricao: r.descricao ?? '',
    valor: Number(r.valor),
    dataCompetencia: r.data_competencia,
    deletedAt: r.deleted_at,
  }));
}

export async function desmarcarPago(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('lancamentos')
    .update({ status: 'previsto', data_pagamento: null })
    .eq('id', id);
  return !error;
}

export async function marcarComoPago(id: string): Promise<boolean> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('lancamentos')
    .update({ status: 'pago', data_pagamento: hoje })
    .eq('id', id);
  return !error;
}
