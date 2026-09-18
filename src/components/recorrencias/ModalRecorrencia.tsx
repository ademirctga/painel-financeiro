'use client';

import { FormEvent, useEffect, useState } from 'react';
import { z } from 'zod';
import { X } from 'lucide-react';
import { fetchCategorias, fetchCentrosCusto, fetchMetodos } from '@/services/analytics.service';
import {
  inserirRecorrencia, atualizarRecorrencia, RecorrenciaInput,
} from '@/services/recorrencias.service';
import { Categoria, CentroCusto, MetodoPagamento, FrequenciaRecorrencia, Recorrencia } from '@/types/financeiro';

const INPUT =
  'w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50';
const LABEL = 'block text-xs font-medium text-slate-400 mb-1.5';

const FREQUENCIAS: { value: FrequenciaRecorrencia; label: string }[] = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];

const schema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória').max(255),
  valor: z.number().positive('O valor deve ser maior que zero'),
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  diaReferencia: z.number().min(1).max(31),
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseMoeda(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatMoeda(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editData?: Recorrencia | null;
}

export function ModalRecorrencia({ open, onClose, onSaved, editData }: Props) {
  const [tipo, setTipo]               = useState<'despesa' | 'receita'>('despesa');
  const [valorRaw, setValorRaw]       = useState('0,00');
  const [valorNum, setValorNum]       = useState(0);
  const [descricao, setDescricao]     = useState('');
  const [frequencia, setFrequencia]   = useState<FrequenciaRecorrencia>('mensal');
  const [diaRef, setDiaRef]           = useState(1);
  const [dataInicio, setDataInicio]   = useState(todayISO());
  const [dataFim, setDataFim]         = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [metodoId, setMetodoId]       = useState('');
  const [centroId, setCentroId]       = useState('');
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [saving, setSaving]           = useState(false);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [metodos, setMetodos]       = useState<MetodoPagamento[]>([]);
  const [centros, setCentros]       = useState<CentroCusto[]>([]);

  // body scroll lock
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Load dropdowns once
  useEffect(() => {
    if (!open) return;
    Promise.all([fetchCategorias(), fetchMetodos(), fetchCentrosCusto()]).then(
      ([c, m, cc]) => { setCategorias(c); setMetodos(m); setCentros(cc); }
    );
  }, [open]);

  // Populate for edit
  useEffect(() => {
    if (!open) return;
    if (editData) {
      setTipo(editData.tipo);
      setValorNum(editData.valor);
      setValorRaw(formatMoeda(editData.valor));
      setDescricao(editData.descricao);
      setFrequencia(editData.frequencia);
      setDiaRef(editData.diaReferencia);
      setDataInicio(editData.dataInicio);
      setDataFim(editData.dataFim ?? '');
      setCategoriaId(editData.categoriaId ?? '');
      setMetodoId(editData.metodoId ?? '');
      setCentroId(editData.centroCustoId ?? '');
    } else {
      setTipo('despesa');
      setValorRaw('0,00');
      setValorNum(0);
      setDescricao('');
      setFrequencia('mensal');
      setDiaRef(1);
      setDataInicio(todayISO());
      setDataFim('');
      setCategoriaId('');
      setMetodoId('');
      setCentroId('');
    }
    setErrors({});
  }, [open, editData]);

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10) / 100;
    setValorNum(num);
    setValorRaw(formatMoeda(num));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ descricao, valor: valorNum, dataInicio, diaReferencia: diaRef });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => { errs[issue.path[0] as string] = issue.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);

    const input: RecorrenciaInput = {
      descricao,
      valor: valorNum,
      tipo,
      frequencia,
      diaReferencia: diaRef,
      dataInicio,
      dataFim: dataFim || null,
      categoriaId: categoriaId || null,
      metodoId: metodoId || null,
      centroCustoId: centroId || null,
    };

    let ok = false;
    if (editData) {
      ok = await atualizarRecorrencia(editData.id, input);
    } else {
      const res = await inserirRecorrencia(input);
      ok = !('error' in res);
    }

    setSaving(false);
    if (ok) { onSaved(); onClose(); }
  }

  const categsFiltradas = categorias.filter((c) => c.tipo === tipo);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5">
          <h2 className="text-base font-semibold text-white">
            {editData ? 'Editar Recorrência' : 'Nova Recorrência'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {(['despesa', 'receita'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTipo(t); setCategoriaId(''); }}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  tipo === t
                    ? t === 'despesa' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                }`}
              >
                {t === 'despesa' ? 'Despesa' : 'Receita'}
              </button>
            ))}
          </div>

          {/* Descrição */}
          <div>
            <label className={LABEL}>Descrição *</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Aluguel, Netflix, Salário..."
              className={INPUT}
            />
            {errors.descricao && <p className="text-xs text-rose-400 mt-1">{errors.descricao}</p>}
          </div>

          {/* Valor */}
          <div>
            <label className={LABEL}>Valor *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={valorRaw}
                onChange={handleValorChange}
                className={INPUT + ' pl-9 text-right'}
              />
            </div>
            {errors.valor && <p className="text-xs text-rose-400 mt-1">{errors.valor}</p>}
          </div>

          {/* Frequência + Dia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Frequência</label>
              <select
                value={frequencia}
                onChange={(e) => setFrequencia(e.target.value as FrequenciaRecorrencia)}
                className={INPUT}
              >
                {FREQUENCIAS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Dia de referência</label>
              <input
                type="number"
                min={1}
                max={31}
                value={diaRef}
                onChange={(e) => setDiaRef(Number(e.target.value))}
                className={INPUT}
              />
              {errors.diaReferencia && <p className="text-xs text-rose-400 mt-1">Inválido</p>}
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Início *</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className={INPUT}
              />
              {errors.dataInicio && <p className="text-xs text-rose-400 mt-1">{errors.dataInicio}</p>}
            </div>
            <div>
              <label className={LABEL}>Fim (opcional)</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className={INPUT}
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className={LABEL}>Categoria</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={INPUT}>
              <option value="">— Sem categoria —</option>
              {categsFiltradas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Método + Centro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Método</label>
              <select value={metodoId} onChange={(e) => setMetodoId(e.target.value)} className={INPUT}>
                <option value="">— Nenhum —</option>
                {metodos.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Centro de custo</label>
              <select value={centroId} onChange={(e) => setCentroId(e.target.value)} className={INPUT}>
                <option value="">— Nenhum —</option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando...' : editData ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}
