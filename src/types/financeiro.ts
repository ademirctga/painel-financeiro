export type TipoLancamento = 'despesa' | 'receita';
export type NaturezaCusto = 'fixo' | 'variavel';
export type StatusLancamento = 'previsto' | 'pago' | 'atrasado' | 'cancelado';
export type TipoMetodo = 'dinheiro' | 'debito' | 'credito' | 'pix' | 'boleto' | 'transferencia';

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  dataCompetencia: string;
  dataPagamento: string | null;
  status: StatusLancamento;
  categoriaId: string | null;
  categoriaNome?: string;
  categoriaCor?: string;
  natureza?: NaturezaCusto;
  fornecedorNome?: string;
  metodoNome?: string;
  centroCustoNome?: string;
  recorrenciaId?: string | null;
  parcelaNumero: number | null;
  parcelaTotal: number | null;
  tags: string[];
  observacao: string | null;
  anexoUrl: string | null;
}

export interface PontoSerie {
  periodo: string;
  valor: number;
  label?: string;
}

export interface FatiaGrafico {
  id: string;
  nome: string;
  valor: number;
  cor: string;
  percentual: number;
}

export interface SerieEmpilhada {
  periodo: string;
  [categoria: string]: number | string;
}

export interface Kpis {
  totalDespesas: number;
  totalReceitas: number;
  saldo: number;
  variacaoPercentual: number;
  custoFixo: number;
  custoVariavel: number;
  aPagar: number;
  emAtraso: number;
  ticketMedio: number;
  maiorCategoria: { nome: string; valor: number };
  projecaoFimMes: number;
  comprometimentoRenda: number;
}

export interface FiltrosDashboard {
  periodo: { inicio: string; fim: string };
  preset: 'mes_atual' | 'proximo_mes' | 'mes_anterior' | 'ultimos_3m' | 'ultimos_12m' | 'ano' | 'custom';
  regime: 'competencia' | 'caixa';
  centrosCusto: string[];
  categorias: string[];
  metodos: string[];
  status: StatusLancamento[];
  natureza?: 'fixo' | 'variavel';
  busca?: string;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  natureza: NaturezaCusto;
  cor: string;
  icone?: string;
}

export interface CentroCusto {
  id: string;
  nome: string;
  cor: string;
}

export interface MetodoPagamento {
  id: string;
  nome: string;
  tipo: TipoMetodo;
}

export interface MensalCategoria {
  mesCompetencia: string;
  tipo: TipoLancamento;
  categoriaId: string;
  categoriaNome: string;
  categoriaCor: string;
  natureza: NaturezaCusto;
  total: number;
  qtd: number;
}

export interface OrcadoRealizado {
  categoriaId: string;
  categoriaNome: string;
  cor: string;
  valorLimite: number;
  realizado: number;
  saldo: number;
  percentual: number;
}

export interface FluxoCaixa {
  dia: string;
  movimento: number;
}

export type FrequenciaRecorrencia =
  | 'semanal'
  | 'quinzenal'
  | 'mensal'
  | 'bimestral'
  | 'trimestral'
  | 'semestral'
  | 'anual';

export interface Recorrencia {
  id: string;
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  categoriaId: string | null;
  categoriaNome?: string;
  categoriaCor?: string;
  metodoId: string | null;
  metodoNome?: string;
  centroCustoId: string | null;
  frequencia: FrequenciaRecorrencia;
  diaReferencia: number;
  dataInicio: string;
  dataFim: string | null;
  ativo: boolean;
}
