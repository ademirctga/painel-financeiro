'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Repeat2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchDespesasRecentes,
  fetchTodasRecorrencias,
  inserirRecorrencia,
  excluirRecorrencia,
  DespesaRecente,
} from '@/services/recorrencias.service';
import type { Recorrencia } from '@/types/financeiro';

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function nextMonthFirst(): string {
  const d = new Date();
  const y = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear();
  const m = d.getMonth() === 11 ? 1 : d.getMonth() + 2;
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

interface Item {
  descricao: string;
  valor: number;
  diaReferencia: number;
  categoriaId: string | null;
  recorrenciaId: string | null;
}

export default function RecorrenciasPage() {
  const router = useRouter();
  const { session, loading: authLoading, signOut } = useAuth();

  const [items, setItems]     = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login');
  }, [session, authLoading, router]);

  useEffect(() => {
    if (!session) return;

    Promise.all([fetchDespesasRecentes(), fetchTodasRecorrencias()]).then(
      ([despesas, recorrencias]) => {
        const recMap = new Map<string, Recorrencia>();
        for (const r of recorrencias) {
          recMap.set(r.descricao.toLowerCase().trim(), r);
        }

        const merged = new Map<string, Item>();

        // Gastos recentes
        for (const d of despesas) {
          const key = d.descricao.toLowerCase().trim();
          const rec = recMap.get(key);
          merged.set(key, {
            descricao: d.descricao,
            valor: d.valor,
            diaReferencia: d.diaReferencia,
            categoriaId: d.categoriaId,
            recorrenciaId: rec?.id ?? null,
          });
        }

        // Recorrências ativas que não aparecem nos gastos recentes
        for (const r of recorrencias) {
          if (!r.ativo) continue;
          const key = r.descricao.toLowerCase().trim();
          if (!merged.has(key)) {
            merged.set(key, {
              descricao: r.descricao,
              valor: r.valor,
              diaReferencia: r.diaReferencia,
              categoriaId: r.categoriaId,
              recorrenciaId: r.id,
            });
          }
        }

        setItems(
          Array.from(merged.values()).sort((a, b) =>
            a.descricao.localeCompare(b.descricao, 'pt-BR')
          )
        );
        setLoading(false);
      }
    );
  }, [session]);

  async function handleToggle(item: Item) {
    if (saving === item.descricao) return;
    setSaving(item.descricao);

    if (item.recorrenciaId) {
      const ok = await excluirRecorrencia(item.recorrenciaId);
      if (ok) {
        setItems((prev) =>
          prev.map((x) =>
            x.descricao === item.descricao ? { ...x, recorrenciaId: null } : x
          )
        );
      }
    } else {
      const result = await inserirRecorrencia({
        descricao: item.descricao,
        valor: item.valor,
        tipo: 'despesa',
        frequencia: 'mensal',
        diaReferencia: item.diaReferencia,
        dataInicio: nextMonthFirst(),
        categoriaId: item.categoriaId,
        ativo: true,
      });
      if ('id' in result) {
        setItems((prev) =>
          prev.map((x) =>
            x.descricao === item.descricao ? { ...x, recorrenciaId: result.id } : x
          )
        );
      }
    }

    setSaving(null);
  }

  if (authLoading || !session) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ativos = items.filter((i) => !!i.recorrenciaId);
  const totalFixo = ativos.reduce((s, i) => s + i.valor, 0);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <header className="border-b border-white/5 sticky top-0 z-10 bg-[#0f1117]/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/mes"
              className="p-1.5 text-slate-500 hover:text-slate-300 active:text-slate-300 transition-colors rounded-lg hover:bg-white/5"
            >
              <ChevronLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <Repeat2 size={16} className="text-violet-400" />
              <h1 className="text-base sm:text-lg font-bold text-white">Recorrências</h1>
            </div>
          </div>
          <button
            onClick={() => signOut().then(() => router.replace('/login'))}
            title="Sair"
            className="p-2 text-slate-500 hover:text-slate-300 active:text-slate-300 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Summary */}
        {!loading && ativos.length > 0 && (
          <div className="bg-[#1a1f2e] border border-white/5 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Total fixo por mês</p>
              <p className="text-xl font-bold text-rose-400 mt-0.5">{brl(totalFixo)}</p>
            </div>
            <p className="text-xs text-slate-600">{ativos.length} recorrências ativas</p>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Marque as contas que devem aparecer automaticamente todo mês.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Repeat2 size={32} className="text-slate-700" />
            <p className="text-sm text-slate-500">Nenhuma despesa nos últimos 2 meses</p>
          </div>
        ) : (
          <div className="bg-[#1a1f2e] border border-white/5 rounded-xl overflow-hidden">
            <ul className="divide-y divide-white/5">
              {items.map((item) => {
                const isRec = !!item.recorrenciaId;
                const isSaving = saving === item.descricao;
                return (
                  <li
                    key={item.descricao}
                    className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                      isRec ? 'hover:bg-white/[0.02]' : 'hover:bg-white/[0.01]'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggle(item)}
                      disabled={isSaving}
                      aria-label={isRec ? 'Remover recorrência' : 'Tornar recorrente'}
                      className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors disabled:opacity-50 ${
                        isRec
                          ? 'bg-violet-600 border-violet-600'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      {isSaving ? (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      ) : isRec ? (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </button>

                    {/* Description */}
                    <span
                      className={`flex-1 text-sm truncate ${
                        isRec ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {item.descricao}
                    </span>

                    {/* Badge mensal */}
                    {isRec && (
                      <span className="text-xs text-violet-400/70 flex-shrink-0">mensal</span>
                    )}

                    {/* Value */}
                    <span
                      className={`text-sm font-medium tabular-nums whitespace-nowrap flex-shrink-0 ${
                        isRec ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {brl(item.valor)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
