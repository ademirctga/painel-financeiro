import { supabase } from './supabase';
import type { Recorrencia, FrequenciaRecorrencia } from '@/types/financeiro';

export interface RecorrenciaInput {
  descricao: string;
  valor: number;
  tipo: 'despesa' | 'receita';
  frequencia: FrequenciaRecorrencia;
  diaReferencia: number;
  dataInicio: string;
  dataFim?: string | null;
  categoriaId?: string | null;
  metodoId?: string | null;
  centroCustoId?: string | null;
  ativo?: boolean;
}

export async function fetchRecorrencias(): Promise<Recorrencia[]> {
  const { data, error } = await supabase
    .from('recorrencias')
    .select(`
      id, descricao, valor, tipo, frequencia, dia_referencia, data_inicio, data_fim, ativo,
      categoria_id, metodo_id, centro_custo_id,
      categorias(nome, cor),
      metodos_pagamento(nome)
    `)
    .eq('ativo', true)
    .order('descricao');

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id: r.id,
    descricao: r.descricao,
    valor: Number(r.valor),
    tipo: r.tipo,
    frequencia: r.frequencia,
    diaReferencia: r.dia_referencia,
    dataInicio: r.data_inicio,
    dataFim: r.data_fim ?? null,
    ativo: r.ativo,
    categoriaId: r.categoria_id ?? null,
    categoriaNome: r.categorias?.nome,
    categoriaCor: r.categorias?.cor,
    metodoId: r.metodo_id ?? null,
    metodoNome: r.metodos_pagamento?.nome,
    centroCustoId: r.centro_custo_id ?? null,
  }));
}

export async function fetchTodasRecorrencias(): Promise<Recorrencia[]> {
  const { data, error } = await supabase
    .from('recorrencias')
    .select(`
      id, descricao, valor, tipo, frequencia, dia_referencia, data_inicio, data_fim, ativo,
      categoria_id, metodo_id, centro_custo_id,
      categorias(nome, cor),
      metodos_pagamento(nome)
    `)
    .order('ativo', { ascending: false })
    .order('descricao');

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id: r.id,
    descricao: r.descricao,
    valor: Number(r.valor),
    tipo: r.tipo,
    frequencia: r.frequencia,
    diaReferencia: r.dia_referencia,
    dataInicio: r.data_inicio,
    dataFim: r.data_fim ?? null,
    ativo: r.ativo,
    categoriaId: r.categoria_id ?? null,
    categoriaNome: r.categorias?.nome,
    categoriaCor: r.categorias?.cor,
    metodoId: r.metodo_id ?? null,
    metodoNome: r.metodos_pagamento?.nome,
    centroCustoId: r.centro_custo_id ?? null,
  }));
}

export async function inserirRecorrencia(input: RecorrenciaInput): Promise<{ id: string } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' };

  const { data, error } = await supabase
    .from('recorrencias')
    .insert({
      user_id: user.id,
      descricao: input.descricao,
      valor: input.valor,
      tipo: input.tipo,
      frequencia: input.frequencia,
      dia_referencia: input.diaReferencia,
      data_inicio: input.dataInicio,
      data_fim: input.dataFim ?? null,
      categoria_id: input.categoriaId ?? null,
      metodo_id: input.metodoId ?? null,
      centro_custo_id: input.centroCustoId ?? null,
      ativo: input.ativo ?? true,
    })
    .select('id')
    .single();

  if (error || !data) return { error: 'Erro ao salvar recorrência.' };
  return { id: data.id as string };
}

export async function atualizarRecorrencia(id: string, input: Partial<RecorrenciaInput>): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  if (input.descricao !== undefined)    patch.descricao = input.descricao;
  if (input.valor !== undefined)        patch.valor = input.valor;
  if (input.tipo !== undefined)         patch.tipo = input.tipo;
  if (input.frequencia !== undefined)   patch.frequencia = input.frequencia;
  if (input.diaReferencia !== undefined) patch.dia_referencia = input.diaReferencia;
  if (input.dataInicio !== undefined)   patch.data_inicio = input.dataInicio;
  if ('dataFim' in input)               patch.data_fim = input.dataFim ?? null;
  if ('categoriaId' in input)           patch.categoria_id = input.categoriaId ?? null;
  if ('metodoId' in input)              patch.metodo_id = input.metodoId ?? null;
  if ('centroCustoId' in input)         patch.centro_custo_id = input.centroCustoId ?? null;
  if (input.ativo !== undefined)        patch.ativo = input.ativo;

  const { error } = await supabase.from('recorrencias').update(patch).eq('id', id);
  return !error;
}

export async function excluirRecorrencia(id: string): Promise<boolean> {
  const { error } = await supabase.from('recorrencias').delete().eq('id', id);
  return !error;
}

export async function toggleRecorrencia(id: string, ativo: boolean): Promise<boolean> {
  const { error } = await supabase.from('recorrencias').update({ ativo }).eq('id', id);
  return !error;
}

// ── Auto-generation ──────────────────────────────────────────────────────────

function mesCompetenciaKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function diaCompetencia(year: number, month: number, diaRef: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(diaRef, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function deveGerarNoMes(rec: Recorrencia, year: number, month: number): boolean {
  const inicioDate = new Date(rec.dataInicio + 'T00:00:00');
  const inicioYear = inicioDate.getFullYear();
  const inicioMonth = inicioDate.getMonth() + 1;

  if (year < inicioYear || (year === inicioYear && month < inicioMonth)) return false;
  if (rec.dataFim) {
    const fimDate = new Date(rec.dataFim + 'T00:00:00');
    if (year > fimDate.getFullYear() || (year === fimDate.getFullYear() && month > fimDate.getMonth() + 1)) return false;
  }

  const mesesDesdeInicio = (year - inicioYear) * 12 + (month - inicioMonth);

  switch (rec.frequencia) {
    case 'semanal':
    case 'quinzenal':
    case 'mensal':     return true;
    case 'bimestral':  return mesesDesdeInicio % 2 === 0;
    case 'trimestral': return mesesDesdeInicio % 3 === 0;
    case 'semestral':  return mesesDesdeInicio % 6 === 0;
    case 'anual':      return mesesDesdeInicio % 12 === 0;
    default:           return false;
  }
}

export async function limparDuplicatasRecorrencia(year: number, month: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('lancamentos')
    .select('id, recorrencia_id, created_at')
    .eq('user_id', user.id)
    .gte('data_competencia', `${mesCompetenciaKey(year, month)}-01`)
    .lte('data_competencia', `${mesCompetenciaKey(year, month)}-31`)
    .not('recorrencia_id', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (!data || data.length === 0) return;

  // Keep only the first (oldest) per recorrencia_id, delete the rest
  const seen = new Map<string, string>();
  const toDelete: string[] = [];
  for (const row of data as { id: string; recorrencia_id: string; created_at: string }[]) {
    if (seen.has(row.recorrencia_id)) {
      toDelete.push(row.id);
    } else {
      seen.set(row.recorrencia_id, row.id);
    }
  }
  if (toDelete.length > 0) {
    await supabase.from('lancamentos').update({ deleted_at: new Date().toISOString() }).in('id', toDelete);
  }
}

export async function gerarLancamentosParaMes(year: number, month: number): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const recorrencias = await fetchRecorrencias();
  if (recorrencias.length === 0) return 0;

  const { data: existentes } = await supabase
    .from('lancamentos')
    .select('recorrencia_id')
    .eq('user_id', user.id)
    .gte('data_competencia', `${mesCompetenciaKey(year, month)}-01`)
    .lte('data_competencia', `${mesCompetenciaKey(year, month)}-31`)
    .not('recorrencia_id', 'is', null);

  const geradosIds = new Set((existentes ?? []).map((l: { recorrencia_id: string }) => l.recorrencia_id));

  const paraGerar = recorrencias.filter(
    (r) => deveGerarNoMes(r, year, month) && !geradosIds.has(r.id)
  );

  if (paraGerar.length === 0) return 0;

  const inserts = paraGerar.map((r) => ({
    user_id: user.id,
    tipo: r.tipo,
    descricao: r.descricao,
    valor: r.valor,
    data_competencia: diaCompetencia(year, month, r.diaReferencia),
    data_pagamento: null,
    status: 'previsto',
    categoria_id: r.categoriaId ?? null,
    metodo_id: r.metodoId ?? null,
    centro_custo_id: r.centroCustoId ?? null,
    recorrencia_id: r.id,
  }));

  const { error } = await supabase.from('lancamentos').insert(inserts);
  return error ? 0 : paraGerar.length;
}

export async function gerarLancamentosDoMes(): Promise<number> {
  const hoje = new Date();
  return gerarLancamentosParaMes(hoje.getFullYear(), hoje.getMonth() + 1);
}
