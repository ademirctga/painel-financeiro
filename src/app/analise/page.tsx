'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFiltros } from '@/hooks/useFiltros';
import {
  fetchKpis, fetchLancamentos, fetchMensalCategoria,
  emptyKpis, computeMensalFromLancamentos,
} from '@/services/analytics.service';
import { fetchSugestoesDescricao, DescricaoSugestao } from '@/services/sugestoes.service';
import {
  excluirLancamento, restaurarLancamento, marcarComoPago,
} from '@/services/lancamentos.service';
import type { LancamentoInput } from '@/services/lancamentos.service';
import type { SaveResult } from '@/components/lancamentos/ModalLancamento';
import { useAuth } from '@/context/AuthContext';
import { Kpis, Lancamento, MensalCategoria } from '@/types/financeiro';
import { LogOut, Database, Plus, CalendarDays, RefreshCw } from 'lucide-react';
import { gerarLancamentosDoMes } from '@/services/recorrencias.service';

import { KpiRow } from '@/components/kpi/KpiRow';
import { BarraFiltros } from '@/components/filters/BarraFiltros';
import { DonutCategorias } from '@/components/charts/DonutCategorias';
import { ReceitaVsDespesa } from '@/components/charts/ReceitaVsDespesa';
import { TabelaLancamentos } from '@/components/tables/TabelaLancamentos';
import { ModalLancamento } from '@/components/lancamentos/ModalLancamento';
import { ModalLixeira } from '@/components/lancamentos/ModalLixeira';
import { Toast } from '@/components/ui/Toast';

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading: authLoading, signOut } = useAuth();
  const { filtros, setPreset, setRegime, setBusca, setNatureza, resetFiltros } = useFiltros();

  const [kpis, setKpis]           = useState<Kpis>(emptyKpis());
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [mensal, setMensal]        = useState<MensalCategoria[]>([]);
  const [loading, setLoading]      = useState(true);
  const [sugestoes, setSugestoes]  = useState<DescricaoSugestao[]>([]);

  // ── modal + toast ────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]      = useState(false);
  const [editId, setEditId]            = useState<string | null>(null);
  const [lixeiraOpen, setLixeiraOpen]  = useState(false);
  const [toast, setToast]              = useState<{ message: string; onUndo?: () => void } | null>(null);

  // ── auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [session, authLoading, router]);

  // ── fetch autocomplete suggestions (once per session, not filter-dependent) ──
  useEffect(() => {
    if (!session) return;
    fetchSugestoesDescricao().then(setSugestoes);
  }, [session]);

  // ── keyboard shortcut N ────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'n' && e.key !== 'N') return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      setEditId(null);
      setModalOpen(true);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ── gerar lançamentos recorrentes do mês (1x por sessão) ────────────────
  useEffect(() => {
    if (!session) return;
    gerarLancamentosDoMes().then((gerados) => {
      if (gerados > 0) refetchAll();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ── data fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    Promise.all([
      fetchKpis(filtros),
      fetchLancamentos(filtros),
      fetchMensalCategoria(filtros),
    ]).then(([k, l, m]) => {
      setKpis(k);
      setLancamentos(l);
      setMensal(filtros.busca ? computeMensalFromLancamentos(l, filtros.regime) : m);
      setLoading(false);
    });
  }, [filtros, session]);

  // ── helpers ─────────────────────────────────────────────────────────────
  function showToast(message: string, onUndo?: () => void) {
    setToast({ message, onUndo });
  }

  function refetchAll() {
    return Promise.all([fetchKpis(filtros), fetchLancamentos(filtros)]).then(([k, l]) => {
      setKpis(k);
      setLancamentos(l);
    });
  }

  // ── handlers ────────────────────────────────────────────────────────────
  async function handleSalvo(input: LancamentoInput, result: SaveResult) {
    if (result.type === 'insert') {
      const delta = input.tipo === 'receita' ? input.valor : -input.valor;
      setKpis((prev) => ({
        ...prev,
        totalReceitas: input.tipo === 'receita' ? prev.totalReceitas + input.valor : prev.totalReceitas,
        totalDespesas: input.tipo === 'despesa' ? prev.totalDespesas + input.valor : prev.totalDespesas,
        saldo: prev.saldo + delta,
      }));
      fetchLancamentos(filtros).then(setLancamentos);
      showToast('Lançamento adicionado', async () => {
        await excluirLancamento(result.id);
        refetchAll();
      });
    } else {
      await refetchAll();
      showToast('Lançamento atualizado');
    }
  }

  async function handleDelete(lancamento: Lancamento) {
    setLancamentos((prev) => prev.filter((l) => l.id !== lancamento.id));
    const delta = lancamento.tipo === 'receita' ? -lancamento.valor : lancamento.valor;
    setKpis((prev) => ({
      ...prev,
      totalReceitas: lancamento.tipo === 'receita' ? prev.totalReceitas - lancamento.valor : prev.totalReceitas,
      totalDespesas: lancamento.tipo === 'despesa' ? prev.totalDespesas - lancamento.valor : prev.totalDespesas,
      saldo: prev.saldo + delta,
    }));
    await excluirLancamento(lancamento.id);
    showToast('Lançamento excluído', async () => {
      await restaurarLancamento(lancamento.id);
      refetchAll();
    });
  }

  async function handleMarkPago(id: string) {
    const ok = await marcarComoPago(id);
    if (!ok) return;
    const hoje = new Date().toISOString().slice(0, 10);
    setLancamentos((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'pago', dataPagamento: hoje } : l))
    );
    fetchKpis(filtros).then(setKpis);
  }

  function handleEdit(id: string) {
    setEditId(id);
    setModalOpen(true);
  }

  // ── render ───────────────────────────────────────────────────────────────
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
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Painel Financeiro</h1>
            <p className="text-xs text-slate-500">
              {filtros.periodo.inicio} até {filtros.periodo.fim}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/mes"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <CalendarDays size={14} />
              Mês
            </Link>
            <Link
              href="/recorrencias"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <RefreshCw size={14} />
              Fixos
            </Link>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-xs text-slate-500">{loading ? 'Carregando...' : 'Atualizado'}</span>
            </div>
            <button
              onClick={() => router.push('/seed')}
              title="Dados de teste"
              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Database size={16} />
            </button>
            <button
              onClick={() => signOut().then(() => router.replace('/login'))}
              title="Sair"
              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
        <BarraFiltros
          filtros={filtros}
          onPreset={setPreset}
          onRegime={setRegime}
          onBusca={setBusca}
          onNatureza={setNatureza}
          onReset={resetFiltros}
          sugestoes={sugestoes}
        />
        <KpiRow kpis={kpis} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <DonutCategorias data={mensal} />
          <div className="lg:col-span-2">
            <ReceitaVsDespesa data={mensal} />
          </div>
        </div>

        <TabelaLancamentos
          data={lancamentos}
          onNovo={() => { setEditId(null); setModalOpen(true); }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMarkPago={handleMarkPago}
          onOpenLixeira={() => setLixeiraOpen(true)}
        />
      </main>

      {/* FAB */}
      <button
        onClick={() => { setEditId(null); setModalOpen(true); }}
        title="Novo lançamento (N)"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        <Plus size={20} />
      </button>

      {/* Modal */}
      <ModalLancamento
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSalvo}
        editId={editId}
      />

      {/* Lixeira */}
      <ModalLixeira
        open={lixeiraOpen}
        onClose={() => setLixeiraOpen(false)}
        onRestored={refetchAll}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.onUndo}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
