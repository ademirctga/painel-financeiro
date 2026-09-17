'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchTodasRecorrencias,
  excluirRecorrencia,
  toggleRecorrencia,
} from '@/services/recorrencias.service';
import type { Recorrencia } from '@/types/financeiro';
import { TabelaRecorrencias } from '@/components/recorrencias/TabelaRecorrencias';
import { ModalRecorrencia } from '@/components/recorrencias/ModalRecorrencia';
import { Toast } from '@/components/ui/Toast';

export default function RecorrenciasPage() {
  const router = useRouter();
  const { session, loading: authLoading, signOut } = useAuth();

  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([]);
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editData, setEditData]         = useState<Recorrencia | null>(null);
  const [toast, setToast]               = useState<{ message: string; onUndo?: () => void } | null>(null);

  // auth guard
  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [session, authLoading, router]);

  async function load() {
    setLoading(true);
    const data = await fetchTodasRecorrencias();
    setRecorrencias(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!session) return;
    load();
  }, [session]);

  function openNova() {
    setEditData(null);
    setModalOpen(true);
  }

  function openEdit(r: Recorrencia) {
    setEditData(r);
    setModalOpen(true);
  }

  async function handleDelete(r: Recorrencia) {
    const ok = await excluirRecorrencia(r.id);
    if (!ok) return;
    setRecorrencias((prev) => prev.filter((x) => x.id !== r.id));
    setToast({
      message: `"${r.descricao}" excluída`,
    });
  }

  async function handleToggle(r: Recorrencia) {
    const novoAtivo = !r.ativo;
    const ok = await toggleRecorrencia(r.id, novoAtivo);
    if (!ok) return;
    setRecorrencias((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, ativo: novoAtivo } : x))
    );
  }

  async function handleSaved() {
    await load();
    setToast({ message: editData ? 'Recorrência atualizada' : 'Recorrência criada' });
  }

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
        <div className="max-w-[1000px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/analise"
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-white/5"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Recorrências</h1>
              <p className="text-xs text-slate-500">Gastos e receitas fixas gerados automaticamente</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
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

      <main className="max-w-[1000px] mx-auto px-6 py-6 space-y-5">
        {/* Summary cards */}
        <SummaryCards recorrencias={recorrencias} />

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <TabelaRecorrencias
            data={recorrencias}
            onNova={openNova}
            onEdit={openEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        )}
      </main>

      <ModalRecorrencia
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        editData={editData}
      />

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

function SummaryCards({ recorrencias }: { recorrencias: Recorrencia[] }) {
  const ativas = recorrencias.filter((r) => r.ativo);
  const totalDespesas = ativas
    .filter((r) => r.tipo === 'despesa')
    .reduce((acc, r) => acc + r.valor, 0);
  const totalReceitas = ativas
    .filter((r) => r.tipo === 'receita')
    .reduce((acc, r) => acc + r.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  function fmt(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-[#1a1f2e] border border-white/5 rounded-xl p-4">
        <p className="text-xs text-slate-500 mb-1">Despesas fixas / mês</p>
        <p className="text-xl font-bold text-rose-400">{fmt(totalDespesas)}</p>
        <p className="text-xs text-slate-600 mt-1">{ativas.filter((r) => r.tipo === 'despesa').length} itens ativos</p>
      </div>
      <div className="bg-[#1a1f2e] border border-white/5 rounded-xl p-4">
        <p className="text-xs text-slate-500 mb-1">Receitas fixas / mês</p>
        <p className="text-xl font-bold text-emerald-400">{fmt(totalReceitas)}</p>
        <p className="text-xs text-slate-600 mt-1">{ativas.filter((r) => r.tipo === 'receita').length} itens ativos</p>
      </div>
      <div className="bg-[#1a1f2e] border border-white/5 rounded-xl p-4">
        <p className="text-xs text-slate-500 mb-1">Saldo fixo / mês</p>
        <p className={`text-xl font-bold ${saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(saldo)}</p>
        <p className="text-xs text-slate-600 mt-1">{ativas.length} recorrências ativas</p>
      </div>
    </div>
  );
}
