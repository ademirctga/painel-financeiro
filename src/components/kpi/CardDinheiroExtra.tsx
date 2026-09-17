'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import {
  fetchDinheiroExtra,
  inserirDinheiroExtra,
  excluirDinheiroExtraItem,
  type DinheiroExtraItem,
} from '@/services/dinheiroExtra.service';

interface Props {
  inicio: string;
  fim: string;
  onAdded: () => void;   // notifica o pai para rebuscar KPIs/lançamentos
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoeda(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const INPUT =
  'w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors';
const LABEL = 'block text-xs font-medium text-slate-400 mb-1.5';

export function CardDinheiroExtra({ inicio, fim, onAdded }: Props) {
  const [items, setItems]         = useState<DinheiroExtraItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [valorRaw, setValorRaw]   = useState('0,00');
  const [valorNum, setValorNum]   = useState(0);
  const [descricao, setDescricao] = useState('');
  const [dataComp, setDataComp]   = useState(todayISO());
  const [saving, setSaving]       = useState(false);
  const [erro, setErro]           = useState('');

  const valorRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const data = await fetchDinheiroExtra(inicio, fim);
    setItems(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [inicio, fim]);

  // ESC fecha modal
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharModal(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  function abrirModal() {
    setValorRaw('0,00');
    setValorNum(0);
    setDescricao('');
    setDataComp(todayISO());
    setErro('');
    setModalOpen(true);
    setTimeout(() => valorRef.current?.select(), 0);
  }

  function fecharModal() {
    setModalOpen(false);
  }

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10) / 100;
    setValorNum(num);
    setValorRaw(formatMoeda(num));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (valorNum <= 0) { setErro('Informe um valor maior que zero.'); return; }
    setSaving(true);
    const ok = await inserirDinheiroExtra(valorNum, descricao, dataComp);
    setSaving(false);
    if (!ok) { setErro('Erro ao salvar. Tente novamente.'); return; }
    fecharModal();
    await load();
    onAdded();
  }

  async function handleDelete(item: DinheiroExtraItem) {
    await excluirDinheiroExtraItem(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    onAdded();
  }

  const total = items.reduce((acc, i) => acc + i.valor, 0);

  return (
    <>
      <div className="bg-[#1a1f2e] border border-amber-500/20 rounded-xl p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Dinheiro Extra</p>
            <p className="text-xl font-bold text-amber-400">
              {loading ? '—' : formatBRL(total)}
            </p>
          </div>
          <button
            onClick={abrirModal}
            title="Adicionar dinheiro extra"
            className="w-8 h-8 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 flex items-center justify-center transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Lista */}
        {!loading && items.length > 0 && (
          <ul className="space-y-1.5 border-t border-white/5 pt-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 group">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">{item.descricao}</p>
                  <p className="text-[11px] text-slate-600">{item.dataCompetencia}</p>
                </div>
                <span className="text-xs font-medium text-amber-400 tabular-nums shrink-0">
                  +{formatMoeda(item.valor)}
                </span>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                >
                  <Trash2 size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {!loading && items.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-1">
            Nenhum valor extra registrado
          </p>
        )}
      </div>

      {/* Mini-modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={fecharModal}
          />
          <div className="relative w-full max-w-sm bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white">Adicionar Dinheiro Extra</h2>
              <button
                onClick={fecharModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
              {/* Valor */}
              <div>
                <label className={LABEL}>Valor *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                  <input
                    ref={valorRef}
                    type="text"
                    inputMode="numeric"
                    value={valorRaw}
                    onChange={handleValorChange}
                    className={INPUT + ' pl-9 text-right'}
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className={LABEL}>Descrição (opcional)</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Freelance, venda de item..."
                  className={INPUT}
                />
              </div>

              {/* Data */}
              <div>
                <label className={LABEL}>Data de recebimento</label>
                <input
                  type="date"
                  value={dataComp}
                  onChange={(e) => setDataComp(e.target.value)}
                  className={INPUT}
                />
              </div>

              {erro && <p className="text-xs text-rose-400">{erro}</p>}

              {/* Botões */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
