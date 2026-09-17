'use client';

import { useRef, useState } from 'react';
import { Lancamento } from '@/types/financeiro';
import { formatBRL, formatDate } from '@/lib/format';
import { STATUS_COLORS } from '@/lib/colors';
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react';

interface Props {
  data: Lancamento[];
  onNovo: () => void;
  onEdit: (id: string) => void;
  onDelete: (lancamento: Lancamento) => void;
  onMarkPago: (id: string) => void;
  onOpenLixeira: () => void;
  onUpdateValor: (id: string, novoValor: number) => Promise<void>;
}

type SortKey = 'dataCompetencia' | 'valor' | 'descricao' | 'status';

function parseMoeda(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatMoeda(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TabelaLancamentos({ data, onNovo, onEdit, onDelete, onMarkPago, onOpenLixeira, onUpdateValor }: Props) {
  const [sortKey, setSortKey]           = useState<SortKey>('dataCompetencia');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');
  const [page, setPage]                 = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingValorId, setEditingValorId]   = useState<string | null>(null);
  const [editingValorRaw, setEditingValorRaw] = useState('');
  const valorInputRef = useRef<HTMLInputElement>(null);
  const PER_PAGE = 15;

  function startEditValor(l: Lancamento) {
    setEditingValorId(l.id);
    setEditingValorRaw(formatMoeda(l.valor));
    setTimeout(() => { valorInputRef.current?.select(); }, 0);
  }

  async function commitEditValor(l: Lancamento) {
    if (editingValorId !== l.id) return;
    setEditingValorId(null);
    const novo = parseMoeda(editingValorRaw);
    if (novo > 0 && novo !== l.valor) {
      await onUpdateValor(l.id, novo);
    }
  }

  function cancelEditValor() {
    setEditingValorId(null);
  }

  function handleValorKeyDown(e: React.KeyboardEvent, l: Lancamento) {
    if (e.key === 'Enter') { e.preventDefault(); commitEditValor(l); }
    if (e.key === 'Escape') cancelEditValor();
  }

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10) / 100;
    setEditingValorRaw(formatMoeda(num));
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  }

  const sorted = [...data].sort((a, b) => {
    const va: string | number = a[sortKey] ?? '';
    const vb: string | number = b[sortKey] ?? '';
    if (typeof va === 'string' && typeof vb === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated  = sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} className="text-slate-600" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-violet-400" />
      : <ChevronDown size={12} className="text-violet-400" />;
  }

  return (
    <div className="bg-[#1a1f2e] border border-white/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400">
          Lançamentos <span className="text-slate-600">({data.length})</span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLixeira}
            title="Lixeira"
            className="p-1.5 text-slate-600 hover:text-slate-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onNovo}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-violet-400/10"
          >
            <Plus size={13} />
            Novo lançamento
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5">
              {([
                ['dataCompetencia', 'Data'],
                ['descricao', 'Descrição'],
                ['valor', 'Valor'],
                ['status', 'Status'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left text-slate-500 font-medium cursor-pointer hover:text-slate-300 select-none"
                  onClick={() => handleSort(key)}
                >
                  <span className="flex items-center gap-1">
                    {label} <SortIcon col={key} />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-slate-500 font-medium">Categoria</th>
              <th className="px-4 py-3 text-left text-slate-500 font-medium">Método</th>
              <th className="px-4 py-3 w-[90px]" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((l) => (
              <tr
                key={l.id}
                className="group border-b border-white/5 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                  {formatDate(l.dataCompetencia)}
                </td>
                <td className="px-4 py-3 text-slate-200 max-w-[200px] truncate">
                  {l.descricao}
                  {l.parcelaNumero && (
                    <span className="ml-1 text-slate-500">
                      ({l.parcelaNumero}/{l.parcelaTotal})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {editingValorId === l.id ? (
                    <input
                      ref={valorInputRef}
                      type="text"
                      inputMode="numeric"
                      value={editingValorRaw}
                      onChange={handleValorChange}
                      onBlur={() => commitEditValor(l)}
                      onKeyDown={(e) => handleValorKeyDown(e, l)}
                      className="w-28 bg-[#0f1117] border border-violet-500 rounded px-2 py-0.5 text-xs font-medium tabular-nums text-right focus:outline-none"
                      style={{ color: l.tipo === 'receita' ? '#10b981' : '#ef4444' }}
                    />
                  ) : (
                    <span
                      title="Clique para editar"
                      onClick={() => startEditValor(l)}
                      className="font-medium tabular-nums cursor-pointer hover:underline underline-offset-2 decoration-dotted"
                      style={{ color: l.tipo === 'receita' ? '#10b981' : '#ef4444' }}
                    >
                      {l.tipo === 'receita' ? '+' : '-'}{formatBRL(l.valor)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {l.status === 'previsto' ? (
                    <button
                      onClick={() => onMarkPago(l.id)}
                      title="Marcar como pago"
                      className="px-2 py-0.5 rounded text-xs font-medium transition-opacity hover:opacity-70"
                      style={{
                        backgroundColor: STATUS_COLORS[l.status] + '20',
                        color: STATUS_COLORS[l.status],
                      }}
                    >
                      {l.status}
                    </button>
                  ) : (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: STATUS_COLORS[l.status] + '20',
                        color: STATUS_COLORS[l.status],
                      }}
                    >
                      {l.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {l.categoriaNome && (
                    <span
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: (l.categoriaCor || '#94a3b8') + '20',
                        color: l.categoriaCor || '#94a3b8',
                      }}
                    >
                      {l.categoriaNome}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{l.metodoNome || '—'}</td>

                {/* Actions */}
                <td className="px-4 py-3">
                  {confirmDeleteId === l.id ? (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => { onDelete(l); setConfirmDeleteId(null); }}
                        className="text-red-400 hover:text-red-300 font-medium"
                      >
                        Excluir
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(l.id)}
                        title="Editar"
                        className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-white/10 rounded transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(l.id)}
                        title="Excluir"
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
          <span className="text-xs text-slate-500">
            {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, sorted.length)} de {sorted.length}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="text-xs px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="text-xs px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
