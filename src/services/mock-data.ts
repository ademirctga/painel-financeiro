import { Lancamento, Categoria, CentroCusto, MetodoPagamento, MensalCategoria, OrcadoRealizado, FluxoCaixa, Kpis } from '@/types/financeiro';
import { colorForIndex } from '@/lib/colors';

export const CATEGORIAS_MOCK: Categoria[] = [
  { id: 'c1', nome: 'Moradia', tipo: 'despesa', natureza: 'fixo', cor: '#6366f1' },
  { id: 'c2', nome: 'Alimentação', tipo: 'despesa', natureza: 'variavel', cor: '#f59e0b' },
  { id: 'c3', nome: 'Transporte', tipo: 'despesa', natureza: 'variavel', cor: '#3b82f6' },
  { id: 'c4', nome: 'Saúde', tipo: 'despesa', natureza: 'variavel', cor: '#10b981' },
  { id: 'c5', nome: 'Educação', tipo: 'despesa', natureza: 'fixo', cor: '#8b5cf6' },
  { id: 'c6', nome: 'Lazer', tipo: 'despesa', natureza: 'variavel', cor: '#ec4899' },
  { id: 'c7', nome: 'Assinaturas', tipo: 'despesa', natureza: 'fixo', cor: '#06b6d4' },
  { id: 'c8', nome: 'Impostos', tipo: 'despesa', natureza: 'fixo', cor: '#ef4444' },
  { id: 'c9', nome: 'Salário', tipo: 'receita', natureza: 'fixo', cor: '#22c55e' },
  { id: 'c10', nome: 'Freelance', tipo: 'receita', natureza: 'variavel', cor: '#84cc16' },
];

export const CENTROS_CUSTO_MOCK: CentroCusto[] = [
  { id: 'cc1', nome: 'Pessoal', cor: '#6366f1' },
  { id: 'cc2', nome: 'Empresa', cor: '#f59e0b' },
  { id: 'cc3', nome: 'Investimentos', cor: '#10b981' },
];

export const METODOS_MOCK: MetodoPagamento[] = [
  { id: 'm1', nome: 'Nubank', tipo: 'credito' },
  { id: 'm2', nome: 'Inter PJ', tipo: 'debito' },
  { id: 'm3', nome: 'Dinheiro', tipo: 'dinheiro' },
  { id: 'm4', nome: 'Pix', tipo: 'pix' },
  { id: 'm5', nome: 'Itaú', tipo: 'credito' },
];

function uuid(prefix: string, n: number) { return `${prefix}-${n}`; }
function dateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const now = new Date();
const curYear = now.getFullYear();
const curMonth = now.getMonth() + 1;

function genMonth(year: number, month: number, offset: number): Lancamento[] {
  const items: Lancamento[] = [];
  let id = offset;

  const despesas: Array<{ desc: string; valor: number; catId: string; catNome: string; catCor: string; nat: 'fixo' | 'variavel'; metId: string; metNome: string; day: number; status: 'pago' | 'previsto' | 'atrasado' }> = [
    { desc: 'Aluguel', valor: 2800, catId: 'c1', catNome: 'Moradia', catCor: '#6366f1', nat: 'fixo', metId: 'm2', metNome: 'Inter PJ', day: 5, status: 'pago' },
    { desc: 'Condomínio', valor: 620, catId: 'c1', catNome: 'Moradia', catCor: '#6366f1', nat: 'fixo', metId: 'm2', metNome: 'Inter PJ', day: 10, status: 'pago' },
    { desc: 'Supermercado', valor: 850 + Math.random() * 200, catId: 'c2', catNome: 'Alimentação', catCor: '#f59e0b', nat: 'variavel', metId: 'm1', metNome: 'Nubank', day: 8, status: 'pago' },
    { desc: 'Restaurantes', valor: 380 + Math.random() * 120, catId: 'c2', catNome: 'Alimentação', catCor: '#f59e0b', nat: 'variavel', metId: 'm1', metNome: 'Nubank', day: 15, status: 'pago' },
    { desc: 'Uber / 99', valor: 220 + Math.random() * 80, catId: 'c3', catNome: 'Transporte', catCor: '#3b82f6', nat: 'variavel', metId: 'm4', metNome: 'Pix', day: 20, status: 'pago' },
    { desc: 'Combustível', valor: 310 + Math.random() * 60, catId: 'c3', catNome: 'Transporte', catCor: '#3b82f6', nat: 'variavel', metId: 'm1', metNome: 'Nubank', day: 12, status: 'pago' },
    { desc: 'Plano de Saúde', valor: 780, catId: 'c4', catNome: 'Saúde', catCor: '#10b981', nat: 'fixo', metId: 'm2', metNome: 'Inter PJ', day: 15, status: 'pago' },
    { desc: 'Farmácia', valor: 120 + Math.random() * 80, catId: 'c4', catNome: 'Saúde', catCor: '#10b981', nat: 'variavel', metId: 'm3', metNome: 'Dinheiro', day: 18, status: 'pago' },
    { desc: 'Curso Online', valor: 490, catId: 'c5', catNome: 'Educação', catCor: '#8b5cf6', nat: 'fixo', metId: 'm1', metNome: 'Nubank', day: 3, status: 'pago' },
    { desc: 'Cinema / Entretenimento', valor: 180 + Math.random() * 100, catId: 'c6', catNome: 'Lazer', catCor: '#ec4899', nat: 'variavel', metId: 'm1', metNome: 'Nubank', day: 22, status: 'pago' },
    { desc: 'Netflix', valor: 55.9, catId: 'c7', catNome: 'Assinaturas', catCor: '#06b6d4', nat: 'fixo', metId: 'm1', metNome: 'Nubank', day: 1, status: 'pago' },
    { desc: 'Spotify', valor: 21.9, catId: 'c7', catNome: 'Assinaturas', catCor: '#06b6d4', nat: 'fixo', metId: 'm1', metNome: 'Nubank', day: 1, status: 'pago' },
    { desc: 'Adobe CC', valor: 199, catId: 'c7', catNome: 'Assinaturas', catCor: '#06b6d4', nat: 'fixo', metId: 'm1', metNome: 'Nubank', day: 5, status: 'pago' },
    { desc: 'Imposto IPTU', valor: 340, catId: 'c8', catNome: 'Impostos', catCor: '#ef4444', nat: 'fixo', metId: 'm2', metNome: 'Inter PJ', day: 28, status: 'pago' },
    { desc: 'Conta de Luz', valor: 210 + Math.random() * 50, catId: 'c1', catNome: 'Moradia', catCor: '#6366f1', nat: 'variavel', metId: 'm4', metNome: 'Pix', day: 20, status: 'pago' },
  ];

  const isPast = year < curYear || (year === curYear && month < curMonth);
  const isCurrent = year === curYear && month === curMonth;

  despesas.forEach((d) => {
    const isDatePast = !isCurrent || d.day <= now.getDate();
    items.push({
      id: uuid('l', id++),
      tipo: 'despesa',
      descricao: d.desc,
      valor: Math.round(d.valor * 100) / 100,
      dataCompetencia: dateStr(year, month, d.day),
      dataPagamento: (isPast || isDatePast) ? dateStr(year, month, d.day) : null,
      status: isPast || isDatePast ? 'pago' : 'previsto',
      categoriaId: d.catId,
      categoriaNome: d.catNome,
      categoriaCor: d.catCor,
      natureza: d.nat,
      metodoNome: d.metNome,
      centroCustoNome: 'Pessoal',
      recorrenciaId: null,
      parcelaNumero: null,
      parcelaTotal: null,
      tags: [],
      observacao: null,
      anexoUrl: null,
    });
  });

  // receitas
  items.push({
    id: uuid('l', id++),
    tipo: 'receita',
    descricao: 'Salário',
    valor: 9500,
    dataCompetencia: dateStr(year, month, 5),
    dataPagamento: isPast ? dateStr(year, month, 5) : null,
    status: isPast ? 'pago' : 'previsto',
    categoriaId: 'c9',
    categoriaNome: 'Salário',
    categoriaCor: '#22c55e',
    natureza: 'fixo',
    metodoNome: 'Inter PJ',
    centroCustoNome: 'Pessoal',
    parcelaNumero: null,
    parcelaTotal: null,
    tags: [],
    observacao: null,
    anexoUrl: null,
  });
  items.push({
    id: uuid('l', id++),
    tipo: 'receita',
    descricao: 'Freelance ' + (month % 2 === 0 ? 'Design' : 'Dev'),
    valor: 1800 + Math.random() * 1200,
    dataCompetencia: dateStr(year, month, 20),
    dataPagamento: isPast ? dateStr(year, month, 20) : null,
    status: isPast ? 'pago' : 'previsto',
    categoriaId: 'c10',
    categoriaNome: 'Freelance',
    categoriaCor: '#84cc16',
    natureza: 'variavel',
    metodoNome: 'Pix',
    centroCustoNome: 'Empresa',
    parcelaNumero: null,
    parcelaTotal: null,
    tags: [],
    observacao: null,
    anexoUrl: null,
  });

  return items;
}

function buildLancamentos(): Lancamento[] {
  const all: Lancamento[] = [];
  let offset = 1;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(curYear, curMonth - 1 - i, 1);
    const items = genMonth(d.getFullYear(), d.getMonth() + 1, offset);
    offset += items.length;
    all.push(...items);
  }
  return all;
}

export const LANCAMENTOS_MOCK: Lancamento[] = buildLancamentos();

export function getMensalCategoria(): MensalCategoria[] {
  const map = new Map<string, MensalCategoria>();
  for (const l of LANCAMENTOS_MOCK) {
    if (l.status === 'cancelado' || !l.categoriaId) continue;
    const mes = l.dataCompetencia.slice(0, 7) + '-01';
    const key = `${mes}|${l.categoriaId}|${l.tipo}`;
    const existing = map.get(key);
    if (existing) {
      existing.total += l.valor;
      existing.qtd += 1;
    } else {
      map.set(key, {
        mesCompetencia: mes,
        tipo: l.tipo,
        categoriaId: l.categoriaId!,
        categoriaNome: l.categoriaNome || '',
        categoriaCor: l.categoriaCor || '#94a3b8',
        natureza: l.natureza || 'variavel',
        total: l.valor,
        qtd: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.mesCompetencia.localeCompare(b.mesCompetencia));
}

export function getFluxoCaixa(): FluxoCaixa[] {
  const map = new Map<string, number>();
  for (const l of LANCAMENTOS_MOCK) {
    if (l.status !== 'pago' || !l.dataPagamento) continue;
    const v = l.tipo === 'receita' ? l.valor : -l.valor;
    map.set(l.dataPagamento, (map.get(l.dataPagamento) || 0) + v);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, movimento]) => ({ dia, movimento }));
}

export function getOrcadoRealizado(): OrcadoRealizado[] {
  const orcamentos = [
    { catId: 'c1', catNome: 'Moradia', cor: '#6366f1', limite: 3600 },
    { catId: 'c2', catNome: 'Alimentação', cor: '#f59e0b', limite: 1200 },
    { catId: 'c3', catNome: 'Transporte', cor: '#3b82f6', limite: 600 },
    { catId: 'c4', catNome: 'Saúde', cor: '#10b981', limite: 1000 },
    { catId: 'c5', catNome: 'Educação', cor: '#8b5cf6', limite: 500 },
    { catId: 'c6', catNome: 'Lazer', cor: '#ec4899', limite: 300 },
    { catId: 'c7', catNome: 'Assinaturas', cor: '#06b6d4', limite: 350 },
    { catId: 'c8', catNome: 'Impostos', cor: '#ef4444', limite: 400 },
  ];

  const mesPeriodo = `${curYear}-${String(curMonth).padStart(2, '0')}`;
  const realizadoMap = new Map<string, number>();
  for (const l of LANCAMENTOS_MOCK) {
    if (l.tipo !== 'despesa' || !l.categoriaId) continue;
    if (!l.dataCompetencia.startsWith(mesPeriodo)) continue;
    if (l.status === 'cancelado') continue;
    realizadoMap.set(l.categoriaId, (realizadoMap.get(l.categoriaId) || 0) + l.valor);
  }

  return orcamentos.map((o) => {
    const realizado = Math.round((realizadoMap.get(o.catId) || 0) * 100) / 100;
    return {
      categoriaId: o.catId,
      categoriaNome: o.catNome,
      cor: o.cor,
      valorLimite: o.limite,
      realizado,
      saldo: o.limite - realizado,
      percentual: o.limite > 0 ? Math.round((realizado / o.limite) * 1000) / 10 : 0,
    };
  });
}

export function getKpis(lancamentos: Lancamento[]): Kpis {
  const despesas = lancamentos.filter((l) => l.tipo === 'despesa' && l.status !== 'cancelado');
  const receitas = lancamentos.filter((l) => l.tipo === 'receita' && l.status !== 'cancelado');
  const totalDespesas = despesas.reduce((s, l) => s + l.valor, 0);
  const totalReceitas = receitas.reduce((s, l) => s + l.valor, 0);
  const custoFixo = despesas.filter((l) => l.natureza === 'fixo').reduce((s, l) => s + l.valor, 0);
  const custoVariavel = despesas.filter((l) => l.natureza === 'variavel').reduce((s, l) => s + l.valor, 0);
  const aPagar = despesas.filter((l) => l.status === 'previsto').reduce((s, l) => s + l.valor, 0);
  const emAtraso = despesas.filter((l) => l.status === 'atrasado').reduce((s, l) => s + l.valor, 0);

  const catMap = new Map<string, { nome: string; valor: number }>();
  for (const l of despesas) {
    if (!l.categoriaNome) continue;
    const cur = catMap.get(l.categoriaNome) || { nome: l.categoriaNome, valor: 0 };
    cur.valor += l.valor;
    catMap.set(l.categoriaNome, cur);
  }
  const maiorCategoria = Array.from(catMap.values()).sort((a, b) => b.valor - a.valor)[0] || { nome: '-', valor: 0 };
  const ticketMedio = despesas.length > 0 ? totalDespesas / despesas.length : 0;

  return {
    totalDespesas,
    totalReceitas,
    saldo: totalReceitas - totalDespesas,
    variacaoPercentual: 5.2,
    custoFixo,
    custoVariavel,
    aPagar,
    emAtraso,
    ticketMedio,
    maiorCategoria,
    projecaoFimMes: totalDespesas * 1.12,
    comprometimentoRenda: totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0,
  };
}
