import { supabase } from './supabase';
import {
  FiltrosDashboard, Lancamento, MensalCategoria, FluxoCaixa,
  OrcadoRealizado, Kpis, Categoria, CentroCusto, MetodoPagamento,
} from '@/types/financeiro';

// ─── helpers ──────────────────────────────────────────────────────────────────

function dateCol(filtros: FiltrosDashboard) {
  return filtros.regime === 'caixa' ? 'data_pagamento' : 'data_competencia';
}

function applyFilters(query: any, filtros: FiltrosDashboard) {
  const col = dateCol(filtros);
  query = query.gte(col, filtros.periodo.inicio).lte(col, filtros.periodo.fim);
  if (filtros.categorias.length) query = query.in('categoria_id', filtros.categorias);
  if (filtros.status.length)     query = query.in('status', filtros.status);
  if (filtros.natureza)          query = query.eq('natureza', filtros.natureza);
  if (filtros.busca)             query = query.ilike('descricao', `%${filtros.busca}%`);
  return query;
}

function mapLancamento(r: any): Lancamento {
  return {
    id: r.id,
    tipo: r.tipo,
    descricao: r.descricao,
    valor: Number(r.valor),
    dataCompetencia: r.data_competencia,
    dataPagamento: r.data_pagamento ?? null,
    status: r.status,
    categoriaId: r.categoria_id ?? null,
    categoriaNome: r.categoria_nome ?? undefined,
    categoriaCor: r.categoria_cor ?? undefined,
    natureza: r.natureza ?? undefined,
    fornecedorNome: r.fornecedor_nome ?? undefined,
    metodoNome: r.metodo_nome ?? undefined,
    centroCustoNome: r.centro_custo_nome ?? undefined,
    parcelaNumero: r.parcela_numero ?? null,
    parcelaTotal: r.parcela_total ?? null,
    tags: r.tags ?? [],
    recorrenciaId: r.recorrencia_id ?? null,
    observacao: r.observacao ?? null,
    anexoUrl: r.anexo_url ?? null,
  };
}

export function emptyKpis(): Kpis {
  return {
    totalDespesas: 0, totalReceitas: 0, saldo: 0, variacaoPercentual: 0,
    custoFixo: 0, custoVariavel: 0, aPagar: 0, emAtraso: 0,
    ticketMedio: 0, maiorCategoria: { nome: '—', valor: 0 },
    projecaoFimMes: 0, comprometimentoRenda: 0,
  };
}

// ─── month filler — fills gaps with zero rows so charts show all months ───────

function fillEmptyMonths(data: MensalCategoria[], mesInicio: string, mesFim: string): MensalCategoria[] {
  const months: string[] = [];
  const d = new Date(mesInicio + 'T12:00:00Z');
  const end = new Date(mesFim + 'T12:00:00Z');
  while (d <= end) {
    months.push(d.toISOString().slice(0, 10));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }

  const present = new Set(data.map((r) => r.mesCompetencia));

  const cats = new Map<string, MensalCategoria>();
  for (const r of data) {
    if (!cats.has(r.categoriaId)) cats.set(r.categoriaId, r);
  }

  const extras: MensalCategoria[] = [];
  for (const month of months) {
    if (!present.has(month)) {
      for (const cat of cats.values()) {
        extras.push({ ...cat, mesCompetencia: month, total: 0, qtd: 0 });
      }
    }
  }

  return [...data, ...extras].sort((a, b) => a.mesCompetencia.localeCompare(b.mesCompetencia));
}

// ─── public API ───────────────────────────────────────────────────────────────

export async function fetchLancamentos(filtros: FiltrosDashboard): Promise<Lancamento[]> {
  let q = supabase
    .from('vw_lancamentos')
    .select(
      'id, tipo, descricao, valor, data_competencia, data_pagamento, status, ' +
      'categoria_id, categoria_nome, categoria_cor, natureza, fornecedor_nome, ' +
      'metodo_nome, centro_custo_nome, parcela_numero, parcela_total, tags, observacao, anexo_url, recorrencia_id'
    )
    .order('data_competencia', { ascending: false })
    .limit(500);
  q = applyFilters(q, filtros);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(mapLancamento);
}

export async function fetchKpis(filtros: FiltrosDashboard): Promise<Kpis> {
  let q = supabase
    .from('vw_lancamentos')
    .select('tipo, valor, status, natureza, categoria_nome');
  q = applyFilters(q, filtros);
  const { data, error } = await q;
  if (error || !data) return emptyKpis();

  const despesas = data.filter((l: any) => l.tipo === 'despesa' && l.status !== 'cancelado');
  const receitas = data.filter((l: any) => l.tipo === 'receita' && l.status !== 'cancelado');
  const totalDespesas  = despesas.reduce((s: number, l: any) => s + Number(l.valor), 0);
  const totalReceitas  = receitas.reduce((s: number, l: any) => s + Number(l.valor), 0);
  const custoFixo      = despesas.filter((l: any) => l.natureza === 'fixo').reduce((s: number, l: any) => s + Number(l.valor), 0);
  const custoVariavel  = despesas.filter((l: any) => l.natureza === 'variavel').reduce((s: number, l: any) => s + Number(l.valor), 0);
  const aPagar         = despesas.filter((l: any) => l.status === 'previsto').reduce((s: number, l: any) => s + Number(l.valor), 0);
  const emAtraso       = despesas.filter((l: any) => l.status === 'atrasado').reduce((s: number, l: any) => s + Number(l.valor), 0);

  const catMap = new Map<string, number>();
  for (const l of despesas) {
    if (!l.categoria_nome) continue;
    catMap.set(l.categoria_nome, (catMap.get(l.categoria_nome) ?? 0) + Number(l.valor));
  }
  const maiorCategoria = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => ({ nome, valor }))[0] ?? { nome: '—', valor: 0 };

  return {
    totalDespesas,
    totalReceitas,
    saldo: totalReceitas - totalDespesas,
    variacaoPercentual: 0,
    custoFixo,
    custoVariavel,
    aPagar,
    emAtraso,
    ticketMedio: despesas.length > 0 ? totalDespesas / despesas.length : 0,
    maiorCategoria,
    projecaoFimMes: totalDespesas,
    comprometimentoRenda: totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0,
  };
}

export async function fetchMensalCategoria(filtros: FiltrosDashboard): Promise<MensalCategoria[]> {
  const mesInicio = filtros.periodo.inicio.slice(0, 7) + '-01';
  const mesFim    = filtros.periodo.fim.slice(0, 7) + '-01';

  const { data, error } = await supabase
    .from('vw_mensal_categoria')
    .select('mes_competencia, tipo, categoria_id, categoria_nome, categoria_cor, natureza, total, qtd')
    .gte('mes_competencia', mesInicio)
    .lte('mes_competencia', mesFim)
    .order('mes_competencia');

  if (error || !data) return [];

  const rows: MensalCategoria[] = data.map((r: any) => ({
    mesCompetencia: r.mes_competencia,
    tipo: r.tipo,
    categoriaId: r.categoria_id,
    categoriaNome: r.categoria_nome,
    categoriaCor: r.categoria_cor ?? '#94a3b8',
    natureza: r.natureza,
    total: Number(r.total),
    qtd: Number(r.qtd),
  }));

  return fillEmptyMonths(rows, mesInicio, mesFim);
}

export async function fetchFluxoCaixa(filtros: FiltrosDashboard): Promise<FluxoCaixa[]> {
  const { data, error } = await supabase
    .from('vw_fluxo_caixa')
    .select('dia, movimento')
    .gte('dia', filtros.periodo.inicio)
    .lte('dia', filtros.periodo.fim)
    .order('dia');

  if (error || !data) return [];
  return data.map((r: any) => ({ dia: r.dia, movimento: Number(r.movimento) }));
}

export async function fetchOrcadoRealizado(): Promise<OrcadoRealizado[]> {
  const hoje = new Date();
  const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('vw_orcado_realizado')
    .select('categoria_id, categoria_nome, cor, valor_limite, realizado, saldo, percentual')
    .eq('mes', mes);

  if (error || !data) return [];
  return data.map((r: any) => ({
    categoriaId: r.categoria_id,
    categoriaNome: r.categoria_nome,
    cor: r.cor ?? '#94a3b8',
    valorLimite: Number(r.valor_limite),
    realizado: Number(r.realizado),
    saldo: Number(r.saldo),
    percentual: Number(r.percentual) || 0,
  }));
}

export async function fetchCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nome, tipo, natureza, cor, icone')
    .eq('ativo', true)
    .is('parent_id', null)
    .order('nome');

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id, nome: r.nome, tipo: r.tipo,
    natureza: r.natureza, cor: r.cor, icone: r.icone ?? undefined,
  }));
}

export async function fetchCentrosCusto(): Promise<CentroCusto[]> {
  const { data, error } = await supabase
    .from('centros_custo')
    .select('id, nome, cor')
    .eq('ativo', true)
    .order('nome');

  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, nome: r.nome, cor: r.cor }));
}

export async function fetchMetodos(): Promise<MetodoPagamento[]> {
  const { data, error } = await supabase
    .from('metodos_pagamento')
    .select('id, nome, tipo')
    .eq('ativo', true)
    .order('nome');

  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, nome: r.nome, tipo: r.tipo }));
}

export async function fetchTopGastos(filtros: FiltrosDashboard, limit = 10): Promise<Lancamento[]> {
  let q = supabase
    .from('vw_lancamentos')
    .select(
      'id, tipo, descricao, valor, data_competencia, data_pagamento, status, ' +
      'categoria_id, categoria_nome, categoria_cor, natureza, fornecedor_nome, ' +
      'metodo_nome, centro_custo_nome, parcela_numero, parcela_total, tags, observacao, anexo_url, recorrencia_id'
    )
    .eq('tipo', 'despesa')
    .order('valor', { ascending: false })
    .limit(limit);
  q = applyFilters(q, filtros);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(mapLancamento);
}

export async function fetchPorMetodo(filtros: FiltrosDashboard) {
  let q = supabase
    .from('vw_lancamentos')
    .select('metodo_nome, valor')
    .eq('tipo', 'despesa');
  q = applyFilters(q, filtros);
  const { data, error } = await q;
  if (error || !data) return [];

  const map = new Map<string, number>();
  for (const r of data) {
    const nome = r.metodo_nome ?? 'Outros';
    map.set(nome, (map.get(nome) ?? 0) + Number(r.valor));
  }
  const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
  return Array.from(map.entries())
    .map(([nome, valor]) => ({
      nome,
      valor,
      percentual: total > 0 ? Math.round((valor / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.valor - a.valor);
}

// ─── client-side aggregators (used when busca is active) ─────────────────────

export function computeMensalFromLancamentos(
  lancamentos: Lancamento[],
  regime: 'competencia' | 'caixa',
): MensalCategoria[] {
  const map = new Map<string, MensalCategoria>();

  for (const l of lancamentos) {
    const date = regime === 'caixa'
      ? (l.dataPagamento ?? l.dataCompetencia)
      : l.dataCompetencia;
    const mes = date.slice(0, 7) + '-01';
    const key = `${mes}|${l.tipo}|${l.categoriaId ?? ''}`;

    if (!map.has(key)) {
      map.set(key, {
        mesCompetencia: mes,
        tipo: l.tipo,
        categoriaId: l.categoriaId ?? '',
        categoriaNome: l.categoriaNome ?? 'Sem categoria',
        categoriaCor: l.categoriaCor ?? '#94a3b8',
        natureza: l.natureza ?? 'variavel',
        total: 0,
        qtd: 0,
      });
    }

    const row = map.get(key)!;
    row.total += l.valor;
    row.qtd += 1;
  }

  return Array.from(map.values()).sort(
    (a, b) => a.mesCompetencia.localeCompare(b.mesCompetencia),
  );
}

export function computeFluxoFromLancamentos(
  lancamentos: Lancamento[],
  regime: 'competencia' | 'caixa',
  periodo: { inicio: string; fim: string },
): FluxoCaixa[] {
  const map = new Map<string, number>();

  for (const l of lancamentos) {
    const dia = regime === 'caixa'
      ? (l.dataPagamento ?? l.dataCompetencia)
      : l.dataCompetencia;
    const delta = l.tipo === 'receita' ? l.valor : -l.valor;
    map.set(dia, (map.get(dia) ?? 0) + delta);
  }

  const result: FluxoCaixa[] = [];
  const d = new Date(periodo.inicio + 'T12:00:00Z');
  const end = new Date(periodo.fim + 'T12:00:00Z');
  while (d <= end) {
    const dia = d.toISOString().slice(0, 10);
    result.push({ dia, movimento: map.get(dia) ?? 0 });
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return result;
}

export async function fetchPorFornecedor(filtros: FiltrosDashboard) {
  let q = supabase
    .from('vw_lancamentos')
    .select('fornecedor_nome, descricao, valor')
    .eq('tipo', 'despesa');
  q = applyFilters(q, filtros);
  const { data, error } = await q;
  if (error || !data) return [];

  const map = new Map<string, number>();
  for (const r of data) {
    const nome = r.fornecedor_nome ?? r.descricao;
    map.set(nome, (map.get(nome) ?? 0) + Number(r.valor));
  }
  return Array.from(map.entries())
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);
}
