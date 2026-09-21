'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchLancamentos, fetchCategorias } from '@/services/analytics.service';
import { seedCategoriasDefault } from '@/services/categorias.service';
import {
  inserirLancamento, atualizarLancamento, marcarComoPago, desmarcarPago, excluirLancamento,
} from '@/services/lancamentos.service';
import { Lancamento, Categoria, FiltrosDashboard, Recorrencia } from '@/types/financeiro';
import { fetchRecorrencias, inserirRecorrencia, excluirRecorrencia, gerarLancamentosParaMes } from '@/services/recorrencias.service';
import { ChevronLeft, ChevronRight, Check, Plus, BarChart2, LogOut, Pencil, Trash2, RefreshCw } from 'lucide-react';

function formatMoeda(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── helpers ──────────────────────────────────────────────────────────────────

function todayYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

function monthPeriod(ym: string): { inicio: string; fim: string } {
  const [y, m] = ym.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { inicio: `${ym}-01`, fim: `${ym}-${String(lastDay).padStart(2, '0')}` };
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MESES[m - 1]} ${y}`;
}

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseValor(s: string): number {
  if (!s.trim()) return 0;
  const cleaned = s.includes(',')
    ? s.replace(/\./g, '').replace(',', '.')
    : s;
  const v = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
  return isNaN(v) || v < 0 ? 0 : v;
}

function filtrosParaMes(ym: string): FiltrosDashboard {
  return {
    preset: 'mes_atual',
    periodo: monthPeriod(ym),
    regime: 'competencia',
    centrosCusto: [],
    categorias: [],
    metodos: [],
    status: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MesPage() {
  const router = useRouter();
  const { session, loading: authLoading, signOut } = useAuth();

  const [mes, setMes]                   = useState(todayYM());
  const [lancamentos, setLancamentos]   = useState<Lancamento[]>([]);
  const [categorias, setCategorias]     = useState<Categoria[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshKey, setRefreshKey]     = useState(0);

  // Salary inline edit
  const [salEditando, setSalEditando]   = useState(false);
  const [salStr, setSalStr]             = useState('');

  // Add form
  const [addOpen, setAddOpen]     = useState(false);
  const [addDesc, setAddDesc]     = useState('');
  const [addValStr, setAddValStr] = useState('');
  const [addVenc, setAddVenc]     = useState('');
  const [addCatId, setAddCatId]   = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // Recorrencias
  const [recorrencias, setRecorrencias]   = useState<Recorrencia[]>([]);
  const [togglingId, setTogglingId]       = useState<string | null>(null);

  // Confirm delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function isRecorrente(l: Lancamento): boolean {
    const desc = l.descricao.toLowerCase().trim();
    return recorrencias.some((r) => r.descricao.toLowerCase().trim() === desc);
  }

  async function handleToggleRecorrente(l: Lancamento) {
    if (togglingId === l.id) return;
    setTogglingId(l.id);
    const desc = l.descricao.toLowerCase().trim();
    const existente = recorrencias.find((r) => r.descricao.toLowerCase().trim() === desc);
    if (existente) {
      const ok = await excluirRecorrencia(existente.id);
      if (ok) setRecorrencias((prev) => prev.filter((r) => r.id !== existente.id));
    } else {
      const day = parseInt(l.dataCompetencia.split('-')[2], 10);
      const dataInicio = monthPeriod(nextMonth(mes)).inicio;
      const result = await inserirRecorrencia({
        descricao: l.descricao,
        valor: l.valor,
        tipo: 'despesa',
        frequencia: 'mensal',
        diaReferencia: day,
        dataInicio,
        categoriaId: l.categoriaId ?? null,
      });
      if ('id' in result) {
        setRecorrencias((prev) => [
          ...prev,
          {
            id: result.id,
            descricao: l.descricao,
            valor: l.valor,
            tipo: 'despesa',
            frequencia: 'mensal',
            diaReferencia: day,
            dataInicio,
            dataFim: null,
            ativo: true,
            categoriaId: l.categoriaId ?? null,
            metodoId: null,
            centroCustoId: null,
          },
        ]);
      }
    }
    setTogglingId(null);
  }

  async function handleDelete(l: Lancamento) {
    await excluirLancamento(l.id);
    setLancamentos((prev) => prev.filter((x) => x.id !== l.id));
    setConfirmDeleteId(null);
  }

  // Inline valor edit
  const [editValorId, setEditValorId]   = useState<string | null>(null);
  const [editValorRaw, setEditValorRaw] = useState('');
  const valorInputRef = useRef<HTMLInputElement>(null);

  function startEditValor(l: Lancamento) {
    setEditValorId(l.id);
    setEditValorRaw(formatMoeda(l.valor));
    setTimeout(() => valorInputRef.current?.select(), 0);
  }

  async function commitEditValor(l: Lancamento) {
    if (editValorId !== l.id) return;
    setEditValorId(null);
    const digits = editValorRaw.replace(/\D/g, '');
    const novo = parseInt(digits || '0', 10) / 100;
    if (novo > 0 && novo !== l.valor) {
      setLancamentos((prev) => prev.map((x) => x.id === l.id ? { ...x, valor: novo } : x));
      await atualizarLancamento(l.id, { valor: novo });
    }
  }

  function handleValorInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10) / 100;
    setEditValorRaw(formatMoeda(num));
  }

  // Auth guard
  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [session, authLoading, router]);

  // Fetch recorrencias once per session
  useEffect(() => {
    if (!session) return;
    fetchRecorrencias().then(setRecorrencias);
  }, [session]);

  // Fetch categorias once + seed defaults in background
  useEffect(() => {
    if (!session) return;
    fetchCategorias().then(setCategorias);
    seedCategoriasDefault().then(() => fetchCategorias().then(setCategorias)).catch(() => {});
  }, [session]);

  // Fetch lancamentos when month or refreshKey changes + auto-detect overdue
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    const [y, m] = mes.split('-').map(Number);
    gerarLancamentosParaMes(y, m).then(() => fetchLancamentos(filtrosParaMes(mes))).then((l) => {
      const today = new Date().toISOString().slice(0, 10);
      const toUpdate = l.filter(
        (item) => item.tipo === 'despesa' && item.status === 'previsto' && item.dataCompetencia < today
      );
      if (toUpdate.length > 0) {
        const updated = l.map((item) =>
          toUpdate.find((u) => u.id === item.id) ? { ...item, status: 'atrasado' as const } : item
        );
        setLancamentos(updated);
        toUpdate.forEach((item) => atualizarLancamento(item.id, { status: 'atrasado' }));
      } else {
        setLancamentos(l);
      }
      setLoading(false);
    });
  }, [session, mes, refreshKey]);

  // ── derived ────────────────────────────────────────────────────────────────
  const receitas = lancamentos.filter((l) => l.tipo === 'receita');
  const despesas = lancamentos.filter((l) => l.tipo === 'despesa' && l.status !== 'cancelado');

  const totalSal = receitas.reduce((s, l) => s + l.valor, 0);
  const aPagar   = despesas
    .filter((l) => l.status === 'previsto' || l.status === 'atrasado')
    .reduce((s, l) => s + l.valor, 0);
  const jaPago   = despesas.filter((l) => l.status === 'pago').reduce((s, l) => s + l.valor, 0);
  const sobra    = totalSal - aPagar - jaPago;

  const despOrdenadas = [...despesas].sort((a, b) => {
    const pr = (s: string) => (s === 'atrasado' ? 0 : s === 'previsto' ? 1 : 2);
    if (pr(a.status) !== pr(b.status)) return pr(a.status) - pr(b.status);
    return a.dataCompetencia.localeCompare(b.dataCompetencia);
  });

  const emAtraso   = despOrdenadas.filter((l) => l.status === 'atrasado');
  const despNormais = despOrdenadas.filter((l) => l.status !== 'atrasado');

  const catsDespesa = categorias.filter((c) => c.tipo === 'despesa');

  // ── salary handlers ────────────────────────────────────────────────────────
  function startSalEdit() {
    setSalStr(totalSal > 0 ? totalSal.toFixed(2).replace('.', ',') : '');
    setSalEditando(true);
  }

  async function saveSalario() {
    const newVal = parseValor(salStr);
    setSalEditando(false);
    if (newVal === 0 && receitas.length === 0) return;

    if (receitas.length > 0) {
      setLancamentos((prev) =>
        prev.map((l) => (l.id === receitas[0].id ? { ...l, valor: newVal } : l))
      );
      await atualizarLancamento(receitas[0].id, { valor: newVal });
    } else {
      await inserirLancamento({
        tipo: 'receita',
        descricao: 'Salário',
        valor: newVal,
        dataCompetencia: monthPeriod(mes).inicio,
        status: 'pago',
      });
      setRefreshKey((k) => k + 1);
    }
  }

  // ── toggle pago ────────────────────────────────────────────────────────────
  async function handleTogglePago(l: Lancamento) {
    const wasPago = l.status === 'pago';
    const hoje = new Date().toISOString().slice(0, 10);
    setLancamentos((prev) =>
      prev.map((item) =>
        item.id === l.id
          ? { ...item, status: wasPago ? 'previsto' : 'pago', dataPagamento: wasPago ? null : hoje }
          : item
      )
    );
    if (wasPago) await desmarcarPago(l.id);
    else await marcarComoPago(l.id);
  }

  // ── add form ───────────────────────────────────────────────────────────────
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valor = parseValor(addValStr);
    if (!addDesc.trim() || valor === 0) return;
    setAddSaving(true);
    await inserirLancamento({
      tipo: 'despesa',
      descricao: addDesc.trim(),
      valor,
      dataCompetencia: addVenc || monthPeriod(mes).fim,
      status: 'previsto',
      categoriaId: addCatId || null,
    });
    setAddDesc('');
    setAddValStr('');
    setAddVenc('');
    setAddCatId('');
    setAddOpen(false);
    setAddSaving(false);
    setRefreshKey((k) => k + 1);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  if (authLoading || !session) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <header className="border-b border-white/5 sticky top-0 z-10 bg-[#0f1117]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-white">Meu Mês</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/analise"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 active:text-slate-300 transition-colors p-1.5"
            >
              <BarChart2 size={16} />
              <span className="hidden sm:inline">Análise</span>
            </Link>
            <button
              onClick={() => signOut().then(() => router.replace('/login'))}
              title="Sair"
              className="p-2 text-slate-500 hover:text-slate-300 active:text-slate-300 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMes(prevMonth(mes))}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-white">{monthLabel(mes)}</span>
          <button
            onClick={() => setMes(nextMonth(mes))}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Salary block */}
        <div className="bg-[#1a1f2e] border border-white/5 rounded-xl px-5 py-4">
          <p className="text-xs text-slate-500 mb-2">Renda do mês</p>
          {salEditando ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm text-slate-500">R$</span>
              <input
                autoFocus
                value={salStr}
                onChange={(e) => setSalStr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveSalario();
                  if (e.key === 'Escape') setSalEditando(false);
                }}
                onBlur={saveSalario}
                inputMode="decimal"
                className="bg-transparent text-2xl font-bold text-white focus:outline-none w-full"
                placeholder="0,00"
              />
            </div>
          ) : (
            <button
              onClick={startSalEdit}
              title="Clique para editar"
              className="text-2xl font-bold text-emerald-400 hover:text-emerald-300 transition-colors text-left"
            >
              {brl(totalSal)}
            </button>
          )}
          {totalSal === 0 && !salEditando && (
            <p className="text-xs text-slate-600 mt-1">Clique para informar a renda</p>
          )}
        </div>

        {/* 4 summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Salário', value: totalSal, cls: 'text-slate-300' },
            { label: 'A pagar', value: aPagar,   cls: 'text-amber-400' },
            { label: 'Pago',    value: jaPago,   cls: 'text-slate-400' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-[#1a1f2e] border border-white/5 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-sm font-semibold tabular-nums ${cls}`}>{brl(value)}</p>
            </div>
          ))}
          <div
            className={`rounded-xl px-4 py-3 border ${
              sobra >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <p className="text-xs text-slate-400 mb-1">Sobra</p>
            <p className={`text-base font-bold tabular-nums ${sobra >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {brl(sobra)}
            </p>
          </div>
        </div>

        {/* Bills card */}
        <div className="bg-[#1a1f2e] border border-white/5 rounded-xl overflow-hidden">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-400">
              Contas <span className="text-slate-600">({despesas.length})</span>
            </h2>
            <button
              onClick={() => setAddOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 px-3 py-1.5 rounded-lg hover:bg-violet-400/10 transition-colors"
            >
              <Plus size={13} />
              Adicionar
            </button>
          </div>

          {/* Add form */}
          {addOpen && (
            <form
              onSubmit={handleAddSubmit}
              className="px-5 py-4 border-b border-white/5 space-y-3"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Descrição"
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  required
                  autoFocus
                  className="flex-1 bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Valor"
                  inputMode="decimal"
                  value={addValStr}
                  onChange={(e) => setAddValStr(e.target.value)}
                  required
                  className="w-28 bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 text-right transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Vencimento</label>
                  <input
                    type="date"
                    value={addVenc}
                    onChange={(e) => setAddVenc(e.target.value)}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Categoria</label>
                  <select
                    value={addCatId}
                    onChange={(e) => setAddCatId(e.target.value)}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                  >
                    <option value="">Sem categoria</option>
                    {catsDespesa.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-1.5 rounded-lg transition-colors"
                >
                  {addSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}

          {/* Em Atraso section */}
          {!loading && emAtraso.length > 0 && (
            <div className="border-b border-white/5">
              <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  Em Atraso ({emAtraso.length})
                </h3>
              </div>
              <ul className="divide-y divide-white/5">
                {emAtraso.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 px-5 py-3 bg-red-500/[0.04] hover:bg-red-500/[0.07] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleTogglePago(l)}
                      className="flex-shrink-0 w-5 h-5 rounded border border-red-400 hover:border-red-300 flex items-center justify-center transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-red-200">{l.descricao}</p>
                      {l.categoriaNome && (
                        <span
                          className="text-xs px-1.5 py-px rounded mt-0.5 inline-block"
                          style={{
                            backgroundColor: (l.categoriaCor || '#94a3b8') + '20',
                            color: l.categoriaCor || '#94a3b8',
                          }}
                        >
                          {l.categoriaNome}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-red-400/70 whitespace-nowrap flex-shrink-0">
                      {new Date(l.dataCompetencia + 'T12:00:00').toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                    {editValorId === l.id ? (
                      <input
                        ref={valorInputRef}
                        type="text"
                        inputMode="numeric"
                        value={editValorRaw}
                        onChange={handleValorInputChange}
                        onBlur={() => commitEditValor(l)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitEditValor(l); }
                          if (e.key === 'Escape') setEditValorId(null);
                        }}
                        className="w-28 bg-[#0f1117] border border-violet-500 rounded px-2 py-0.5 text-sm font-medium tabular-nums text-right text-slate-200 focus:outline-none flex-shrink-0"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditValor(l)}
                        className="flex items-center gap-1 group/val text-sm font-semibold tabular-nums whitespace-nowrap flex-shrink-0 text-red-400"
                      >
                        {brl(l.valor)}
                        <Pencil size={10} className="opacity-0 group-hover/val:opacity-60 transition-opacity" />
                      </button>
                    )}
                    {/* Recurring toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleRecorrente(l)}
                      disabled={togglingId === l.id}
                      title={isRecorrente(l) ? 'Remover recorrência' : 'Tornar fixo nos próximos meses'}
                      className={`flex-shrink-0 p-1.5 transition-colors rounded disabled:opacity-40 ${
                        isRecorrente(l)
                          ? 'text-violet-400 hover:text-violet-300 active:text-violet-300'
                          : 'text-slate-600 hover:text-slate-400 active:text-slate-400'
                      }`}
                    >
                      <RefreshCw size={13} className={togglingId === l.id ? 'animate-spin' : ''} />
                    </button>
                    {/* Delete */}
                    {confirmDeleteId === l.id ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDelete(l)}
                          className="text-xs text-red-400 hover:text-red-300 font-medium"
                        >
                          Excluir
                        </button>
                        <span className="text-slate-600 text-xs">|</span>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-slate-500 hover:text-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(l.id)}
                        className="flex-shrink-0 p-1.5 text-slate-600 hover:text-red-400 active:text-red-400 transition-colors rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bills list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : despOrdenadas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-sm text-slate-500">Nenhuma conta neste mês</p>
              <button
                onClick={() => setAddOpen(true)}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Adicionar conta
              </button>
            </div>
          ) : despNormais.length === 0 && emAtraso.length > 0 ? null : (
            <ul className="divide-y divide-white/5">
              {despNormais.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleTogglePago(l)}
                    className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      l.status === 'pago'
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    {l.status === 'pago' && <Check size={11} className="text-white" />}
                  </button>

                  {/* Description + badges */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        l.status === 'pago' ? 'text-slate-500 line-through' : 'text-slate-200'
                      }`}
                    >
                      {l.descricao}
                    </p>
                    {l.categoriaNome && (
                      <span
                        className="text-xs px-1.5 py-px rounded mt-0.5 inline-block"
                        style={{
                          backgroundColor: (l.categoriaCor || '#94a3b8') + '20',
                          color: l.categoriaCor || '#94a3b8',
                        }}
                      >
                        {l.categoriaNome}
                      </span>
                    )}
                  </div>

                  {/* Vencimento */}
                  <span className="text-xs text-slate-600 whitespace-nowrap flex-shrink-0">
                    {new Date(l.dataCompetencia + 'T12:00:00').toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>

                  {/* Value — inline edit */}
                  {editValorId === l.id ? (
                    <input
                      ref={valorInputRef}
                      type="text"
                      inputMode="numeric"
                      value={editValorRaw}
                      onChange={handleValorInputChange}
                      onBlur={() => commitEditValor(l)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEditValor(l); }
                        if (e.key === 'Escape') setEditValorId(null);
                      }}
                      className="w-28 bg-[#0f1117] border border-violet-500 rounded px-2 py-0.5 text-sm font-medium tabular-nums text-right text-slate-200 focus:outline-none flex-shrink-0"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditValor(l)}
                      className={`flex items-center gap-1 group/val text-sm font-medium tabular-nums whitespace-nowrap flex-shrink-0 ${
                        l.status === 'pago' ? 'text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {brl(l.valor)}
                      <Pencil size={10} className="opacity-0 group-hover/val:opacity-60 transition-opacity" />
                    </button>
                  )}

                  {/* Recurring toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleRecorrente(l)}
                    disabled={togglingId === l.id}
                    title={isRecorrente(l) ? 'Remover recorrência' : 'Tornar fixo nos próximos meses'}
                    className={`flex-shrink-0 p-1.5 transition-colors rounded disabled:opacity-40 ${
                      isRecorrente(l)
                        ? 'text-violet-400 hover:text-violet-300 active:text-violet-300'
                        : 'text-slate-600 hover:text-slate-400 active:text-slate-400'
                    }`}
                  >
                    <RefreshCw size={13} className={togglingId === l.id ? 'animate-spin' : ''} />
                  </button>
                  {/* Delete */}
                  {confirmDeleteId === l.id ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDelete(l)}
                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                      >
                        Excluir
                      </button>
                      <span className="text-slate-600 text-xs">|</span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(l.id)}
                      className="flex-shrink-0 p-1.5 text-slate-600 hover:text-red-400 active:text-red-400 transition-colors rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
