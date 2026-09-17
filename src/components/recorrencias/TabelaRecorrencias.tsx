'use client';

import { Pencil, Trash2, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import type { Recorrencia, FrequenciaRecorrencia } from '@/types/financeiro';

const FREQ_LABEL: Record<FrequenciaRecorrencia, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

function formatValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface Props {
  data: Recorrencia[];
  onNova: () => void;
  onEdit: (r: Recorrencia) => void;
  onDelete: (r: Recorrencia) => void;
  onToggle: (r: Recorrencia) => void;
}

export function TabelaRecorrencias({ data, onNova, onEdit, onDelete, onToggle }: Props) {
  const despesas = data.filter((r) => r.tipo === 'despesa');
  const receitas = data.filter((r) => r.tipo === 'receita');

  return (
    <div className="bg-[#1a1f2e] border border-white/5 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <div>
          <h2 className="text-sm font-semibold text-white">Recorrências</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.filter((r) => r.ativo).length} ativas · geradas automaticamente todo mês
          </p>
        </div>
        <button
          onClick={onNova}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus size={13} />
          Nova
        </button>
      </div>

      {data.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-slate-500 text-sm">Nenhuma recorrência cadastrada.</p>
          <button
            onClick={onNova}
            className="mt-3 text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
          >
            Criar primeira recorrência
          </button>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {receitas.length > 0 && (
            <Section
              title="Receitas"
              items={receitas}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
            />
          )}
          {despesas.length > 0 && (
            <Section
              title="Despesas"
              items={despesas}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  onEdit,
  onDelete,
  onToggle,
}: {
  title: string;
  items: Recorrencia[];
  onEdit: (r: Recorrencia) => void;
  onDelete: (r: Recorrencia) => void;
  onToggle: (r: Recorrencia) => void;
}) {
  const isDespesa = title === 'Despesas';
  return (
    <div>
      <div className="px-5 py-2 bg-white/[0.02]">
        <span className={`text-xs font-semibold tracking-wide uppercase ${isDespesa ? 'text-rose-400' : 'text-emerald-400'}`}>
          {title}
        </span>
      </div>
      {items.map((r) => (
        <RecorrenciaRow
          key={r.id}
          recorrencia={r}
          isDespesa={isDespesa}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function RecorrenciaRow({
  recorrencia: r,
  isDespesa,
  onEdit,
  onDelete,
  onToggle,
}: {
  recorrencia: Recorrencia;
  isDespesa: boolean;
  onEdit: (r: Recorrencia) => void;
  onDelete: (r: Recorrencia) => void;
  onToggle: (r: Recorrencia) => void;
}) {
  return (
    <div
      className={`px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors ${!r.ativo ? 'opacity-50' : ''}`}
    >
      {/* Cor da categoria */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: r.categoriaCor ?? (isDespesa ? '#f43f5e' : '#10b981') }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{r.descricao}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {r.categoriaNome && (
            <span className="text-xs text-slate-500">{r.categoriaNome}</span>
          )}
          <span className="text-xs text-slate-600">·</span>
          <span className="text-xs text-slate-500">
            {FREQ_LABEL[r.frequencia]} · dia {r.diaReferencia}
          </span>
          {!r.ativo && (
            <span className="text-xs text-amber-500/70">pausada</span>
          )}
        </div>
      </div>

      {/* Valor */}
      <span className={`text-sm font-medium tabular-nums ${isDespesa ? 'text-rose-400' : 'text-emerald-400'}`}>
        {isDespesa ? '−' : '+'}{r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </span>

      {/* Ações */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onToggle(r)}
          title={r.ativo ? 'Pausar' : 'Ativar'}
          className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded"
        >
          {r.ativo ? <ToggleRight size={16} className="text-violet-400" /> : <ToggleLeft size={16} />}
        </button>
        <button
          onClick={() => onEdit(r)}
          title="Editar"
          className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(r)}
          title="Excluir"
          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors rounded"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
