'use client';

import { useEffect, useState } from 'react';
import { X, RotateCcw, Trash2 } from 'lucide-react';
import {
  fetchLancamentosExcluidos,
  restaurarLancamento,
  esvaziarLixeira,
  LancamentoExcluido,
} from '@/services/lancamentos.service';
import { formatBRL, formatDate } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export function ModalLixeira({ open, onClose, onRestored }: Props) {
  const [items, setItems]         = useState<LancamentoExcluido[]>([]);
  const [loading, setLoading]     = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [emptying, setEmptying]   = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchLancamentosExcluidos().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  async function handleEsvaziar() {
    setEmptying(true);
    const ok = await esvaziarLixeira();
    if (ok) setItems([]);
    setEmptying(false);
    setConfirmEmpty(false);
  }

  async function handleRestore(id: string) {
    setRestoring(id);
    const ok = await restaurarLancamento(id);
    if (ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      onRestored();
    }
    setRestoring(null);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-full sm:max-w-2xl bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Trash2 size={15} className="text-slate-500" />
            <h2 className="text-sm font-medium text-white">Lixeira</h2>
            {!loading && (
              <span className="text-xs text-slate-600">({items.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!loading && items.length > 0 && (
              confirmEmpty ? (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={handleEsvaziar}
                    disabled={emptying}
                    className="text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                  >
                    {emptying ? 'Apagando...' : 'Confirmar'}
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={() => setConfirmEmpty(false)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmEmpty(true)}
                  className="text-xs text-slate-500 hover:text-red-400 active:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-400/10"
                >
                  Esvaziar
                </button>
              )
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Trash2 size={36} className="text-slate-700" />
              <p className="text-sm text-slate-500">Lixeira vazia</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left text-slate-500 font-medium">Excluído em</th>
                  <th className="px-4 py-3 text-left text-slate-500 font-medium">Descrição</th>
                  <th className="px-4 py-3 text-left text-slate-500 font-medium">Valor</th>
                  <th className="px-4 py-3 text-left text-slate-500 font-medium">Competência</th>
                  <th className="px-4 py-3 w-[100px]" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(item.deletedAt.slice(0, 10))}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-[240px] truncate">
                      {item.descricao}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap font-medium tabular-nums"
                      style={{ color: item.tipo === 'receita' ? '#10b981' : '#ef4444' }}
                    >
                      {item.tipo === 'receita' ? '+' : '-'}{formatBRL(item.valor)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDate(item.dataCompetencia)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRestore(item.id)}
                        disabled={restoring === item.id}
                        title="Restaurar"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 hover:text-emerald-300 active:text-emerald-300 hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={12} className={restoring === item.id ? 'animate-spin' : ''} />
                        Restaurar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
