'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { fetchCategorias, fetchCentrosCusto, fetchMetodos } from '@/services/analytics.service';
import { inserirLancamento, atualizarLancamento, LancamentoInput, InsertResult } from '@/services/lancamentos.service';
import { fetchSugestoesDescricao, DescricaoSugestao } from '@/services/sugestoes.service';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import { Categoria, CentroCusto, MetodoPagamento } from '@/types/financeiro';

export type SaveResult =
  | { type: 'insert'; id: string }
  | { type: 'update'; id: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (input: LancamentoInput, result: SaveResult) => void;
  editId?: string | null;
}

const schema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória').max(255),
  valor: z.number().positive('O valor deve ser maior que zero'),
  dataCompetencia: z.string().min(1, 'Data é obrigatória'),
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoeda(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const INPUT =
  'w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50';
const LABEL = 'block text-xs font-medium text-slate-400 mb-1.5';

export function ModalLancamento({ open, onClose, onSaved, editId }: Props) {
  const [tipo, setTipo]                     = useState<'despesa' | 'receita'>('despesa');
  const [valorRaw, setValorRaw]             = useState('0,00');
  const [valorNum, setValorNum]             = useState(0);
  const [descricao, setDescricao]           = useState('');
  const [categoriaId, setCategoriaId]       = useState('');
  const [dataComp, setDataComp]             = useState(todayISO());
  const [status, setStatus]                 = useState<'previsto' | 'pago'>('previsto');
  const [mais, setMais]                     = useState(false);
  const [metodoId, setMetodoId]             = useState('');
  const [centroId, setCentroId]             = useState('');
  const [dataPgto, setDataPgto]             = useState('');
  const [fornecedorId, setFornecedorId]     = useState('');
  const [observacao, setObservacao]         = useState('');
  const [errors, setErrors]                 = useState<Record<string, string>>({});
  const [saving, setSaving]                 = useState(false);
  const [loadingData, setLoadingData]       = useState(false);

  const [categorias, setCategorias]         = useState<Categoria[]>([]);
  const [metodos, setMetodos]               = useState<MetodoPagamento[]>([]);
  const [centros, setCentros]               = useState<CentroCusto[]>([]);
  const [fornecedores, setFornecedores]     = useState<{ id: string; nome: string }[]>([]);
  const [sugestoes, setSugestoes]           = useState<DescricaoSugestao[]>([]);

  const valorRef = useRef<HTMLInputElement>(null);

  // ── body scroll lock ────────────────────────────────────────────────────
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ── ESC ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // ── Load aux data + prefill ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaving(false);
    setLoadingData(true);

    async function load() {
      const [cats, mets, cents, { data: fornsData }, sugs] = await Promise.all([
        fetchCategorias(),
        fetchMetodos(),
        fetchCentrosCusto(),
        supabase.from('fornecedores').select('id, nome').order('nome'),
        fetchSugestoesDescricao(),
      ]);
      setCategorias(cats);
      setMetodos(mets);
      setCentros(cents);
      setFornecedores((fornsData ?? []) as { id: string; nome: string }[]);
      setSugestoes(sugs);

      if (editId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: r } = (await supabase
          .from('lancamentos')
          .select(
            'tipo, descricao, valor, data_competencia, data_pagamento, status, ' +
            'categoria_id, metodo_id, centro_custo_id, fornecedor_id, observacao'
          )
          .eq('id', editId)
          .single()) as { data: Record<string, unknown> | null; error: unknown };

        if (r) {
          const t = r.tipo as 'despesa' | 'receita';
          const v = Number(r.valor);
          setTipo(t);
          setValorNum(v);
          setValorRaw(formatMoeda(v));
          const str = (k: string) => (r[k] as string | null) ?? '';
          setDescricao(str('descricao'));
          setCategoriaId(str('categoria_id'));
          setDataComp(str('data_competencia') || todayISO());
          setStatus(r.status === 'pago' ? 'pago' : 'previsto');
          setMetodoId(str('metodo_id'));
          setCentroId(str('centro_custo_id'));
          setDataPgto(str('data_pagamento'));
          setFornecedorId(str('fornecedor_id'));
          setObservacao(str('observacao'));
          setMais(!!(r.metodo_id || r.centro_custo_id || r.data_pagamento || r.fornecedor_id || r.observacao));
        }
      } else {
        setTipo('despesa');
        setValorNum(0);
        setValorRaw('0,00');
        setDescricao('');
        setCategoriaId('');
        setDataComp(todayISO());
        setStatus('previsto');
        setMetodoId('');
        setCentroId('');
        setDataPgto('');
        setFornecedorId('');
        setObservacao('');
        setMais(false);
      }

      setLoadingData(false);
      setTimeout(() => valorRef.current?.focus(), 60);
    }

    load();
  }, [open, editId]);

  // Must be called before any early return (React hooks rule)
  const acDesc = useAutocomplete(sugestoes, descricao);

  if (!open) return null;

  const catsFiltradas = categorias.filter((c) => c.tipo === tipo);

  function handleDescSelect(item: DescricaoSugestao) {
    acDesc.close();
    setDescricao(item.descricao);
    if (errors.descricao) setErrors((p) => ({ ...p, descricao: '' }));
    // Fill categoria only if compatible with current tipo
    if (item.categoriaId && categorias.some((c) => c.id === item.categoriaId && c.tipo === tipo)) {
      setCategoriaId(item.categoriaId);
    }
    // Fill metodo if available
    if (item.metodoId) {
      setMetodoId(item.metodoId);
      setMais(true);
    }
  }

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    const cents = parseInt(digits || '0', 10);
    const num = cents / 100;
    setValorNum(num);
    setValorRaw(formatMoeda(num));
    if (errors.valor) setErrors((p) => ({ ...p, valor: '' }));
  }

  function handleTipo(t: 'despesa' | 'receita') {
    setTipo(t);
    setCategoriaId('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ descricao, valor: valorNum, dataCompetencia: dataComp });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const err of parsed.error.issues) errs[String(err.path[0])] = err.message;
      setErrors(errs);
      return;
    }

    setSaving(true);
    const input: LancamentoInput = {
      tipo,
      descricao,
      valor: valorNum,
      dataCompetencia: dataComp,
      dataPagamento: dataPgto || null,
      status,
      categoriaId: categoriaId || null,
      metodoId: metodoId || null,
      centroCustoId: centroId || null,
      fornecedorId: fornecedorId || null,
      observacao: observacao || null,
    };

    if (editId) {
      const ok = await atualizarLancamento(editId, input);
      setSaving(false);
      if (ok) { onSaved(input, { type: 'update', id: editId }); onClose(); }
      else setErrors((p) => ({ ...p, _form: 'Erro ao atualizar lançamento. Tente novamente.' }));
    } else {
      const result: InsertResult = await inserirLancamento(input);
      setSaving(false);
      if ('id' in result) {
        onSaved(input, { type: 'insert', id: result.id });
        onClose();
      } else {
        setErrors((p) => ({ ...p, _form: result.error }));
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex gap-1 p-0.5 bg-[#0f1117] rounded-lg">
            {(['despesa', 'receita'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTipo(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tipo === t
                    ? t === 'despesa'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t === 'despesa' ? 'Despesa' : 'Receita'}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Form (wraps scrollable body + footer) ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

            {/* Valor */}
            <div>
              <label className={LABEL}>Valor *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                  R$
                </span>
                <input
                  ref={valorRef}
                  type="text"
                  inputMode="decimal"
                  value={valorRaw}
                  onChange={handleValorChange}
                  className={`${INPUT} pl-9`}
                  placeholder="0,00"
                  disabled={loadingData}
                />
              </div>
              {errors.valor && <p className="text-xs text-red-400 mt-1">{errors.valor}</p>}
            </div>

            {/* Descrição */}
            <div>
              <label className={LABEL}>Descrição *</label>
              <div className="relative">
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => {
                    setDescricao(e.target.value);
                    acDesc.openDropdown();
                    if (errors.descricao) setErrors((p) => ({ ...p, descricao: '' }));
                  }}
                  onKeyDown={(e) => acDesc.handleKeyDown(e, handleDescSelect)}
                  onBlur={acDesc.close}
                  className={INPUT}
                  placeholder="Ex: Aluguel, Salário, Assinatura…"
                  maxLength={255}
                  disabled={loadingData}
                />
                {acDesc.isOpen && (
                  <AutocompleteDropdown
                    items={acDesc.items}
                    activeIndex={acDesc.activeIndex}
                    query={descricao}
                    onSelect={handleDescSelect}
                    onMouseEnter={acDesc.setActiveIndex}
                  />
                )}
              </div>
              {errors.descricao && <p className="text-xs text-red-400 mt-1">{errors.descricao}</p>}
            </div>

            {/* Categoria + Data competência */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Categoria</label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className={`${INPUT} appearance-none`}
                  disabled={loadingData}
                >
                  <option value="">Sem categoria</option>
                  {catsFiltradas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>Vencimento *</label>
                <input
                  type="date"
                  value={dataComp}
                  onChange={(e) => {
                    setDataComp(e.target.value);
                    if (errors.dataCompetencia) setErrors((p) => ({ ...p, dataCompetencia: '' }));
                  }}
                  className={INPUT}
                  disabled={loadingData}
                />
                {errors.dataCompetencia && (
                  <p className="text-xs text-red-400 mt-1">{errors.dataCompetencia}</p>
                )}
              </div>
            </div>

            {/* Mais opções toggle */}
            <div className="border-t border-white/5 pt-2">
              <button
                type="button"
                onClick={() => setMais((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {mais ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Mais opções
              </button>

              {mais && (
                <div className="mt-4 space-y-4">
                  {/* Método + Centro */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Método de pagamento</label>
                      <select
                        value={metodoId}
                        onChange={(e) => setMetodoId(e.target.value)}
                        className={`${INPUT} appearance-none`}
                        disabled={loadingData}
                      >
                        <option value="">Nenhum</option>
                        {metodos.map((m) => (
                          <option key={m.id} value={m.id}>{m.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Centro de custo</label>
                      <select
                        value={centroId}
                        onChange={(e) => setCentroId(e.target.value)}
                        className={`${INPUT} appearance-none`}
                        disabled={loadingData}
                      >
                        <option value="">Nenhum</option>
                        {centros.map((c) => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Data pagamento */}
                  <div>
                    <label className={LABEL}>Data de pagamento</label>
                    <input
                      type="date"
                      value={dataPgto}
                      onChange={(e) => setDataPgto(e.target.value)}
                      className={INPUT}
                      disabled={loadingData}
                    />
                  </div>

                  {/* Fornecedor */}
                  {fornecedores.length > 0 && (
                    <div>
                      <label className={LABEL}>Fornecedor</label>
                      <select
                        value={fornecedorId}
                        onChange={(e) => setFornecedorId(e.target.value)}
                        className={`${INPUT} appearance-none`}
                        disabled={loadingData}
                      >
                        <option value="">Nenhum</option>
                        {fornecedores.map((f) => (
                          <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Observação */}
                  <div>
                    <label className={LABEL}>Observação</label>
                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      className={`${INPUT} resize-none`}
                      rows={2}
                      placeholder="Detalhes adicionais…"
                      disabled={loadingData}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex-shrink-0 border-t border-white/5">
            {errors._form && (
              <p className="px-5 pt-3 text-xs text-red-400 text-center">{errors._form}</p>
            )}
          <div className="flex gap-3 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || loadingData}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                tipo === 'despesa'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {saving ? 'Salvando…' : editId ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
          </div>
        </form>
      </div>
    </div>
  );
}
