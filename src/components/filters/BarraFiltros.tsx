'use client';

import { useEffect, useRef, useState } from 'react';
import { FiltrosDashboard } from '@/types/financeiro';
import { Search, X, RefreshCw } from 'lucide-react';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { AutocompleteDropdown } from '@/components/ui/AutocompleteDropdown';
import type { DescricaoSugestao } from '@/services/sugestoes.service';

interface Props {
  filtros: FiltrosDashboard;
  onPreset: (p: FiltrosDashboard['preset']) => void;
  onRegime: (r: FiltrosDashboard['regime']) => void;
  onBusca: (b: string) => void;
  onNatureza: (n?: 'fixo' | 'variavel') => void;
  onReset: () => void;
  sugestoes?: DescricaoSugestao[];
}

const PRESETS: { key: FiltrosDashboard['preset']; label: string }[] = [
  { key: 'mes_anterior', label: 'Mês anterior' },
  { key: 'mes_atual', label: 'Mês atual' },
  { key: 'proximo_mes', label: 'Próximo mês' },
  { key: 'ultimos_3m', label: '3 meses' },
  { key: 'ultimos_12m', label: '12 meses' },
  { key: 'ano', label: 'Este ano' },
];

export function BarraFiltros({ filtros, onPreset, onRegime, onBusca, onNatureza, onReset, sugestoes = [] }: Props) {
  const [localBusca, setLocalBusca] = useState(filtros.busca ?? '');
  const onBuscaRef = useRef(onBusca);
  onBuscaRef.current = onBusca;

  const ac = useAutocomplete(sugestoes, localBusca);

  // Sync local value when parent resets (e.g. "Limpar" button)
  const prevGlobal = useRef(filtros.busca ?? '');
  useEffect(() => {
    const next = filtros.busca ?? '';
    if (next !== prevGlobal.current) {
      prevGlobal.current = next;
      setLocalBusca(next);
    }
  }, [filtros.busca]);

  // Propagate to global state after 400 ms of idle typing
  useEffect(() => {
    const t = setTimeout(() => onBuscaRef.current(localBusca), 400);
    return () => clearTimeout(t);
  }, [localBusca]);

  function clearBusca() {
    prevGlobal.current = '';
    setLocalBusca('');
    ac.close();
    onBuscaRef.current(''); // immediate, no wait
  }

  function handleBuscaSelect(item: DescricaoSugestao) {
    ac.close();
    prevGlobal.current = item.descricao;
    setLocalBusca(item.descricao);
    onBuscaRef.current(item.descricao); // immediate, no debounce
  }

  return (
    <div className="bg-[#1a1f2e] border border-white/5 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
      {/* Period presets */}
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPreset(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtros.preset === p.key
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="hidden sm:block w-px h-5 bg-white/10" />

      {/* Regime */}
      <div className="flex gap-1">
        {(['competencia', 'caixa'] as const).map((r) => (
          <button
            key={r}
            onClick={() => onRegime(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtros.regime === r
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {r === 'competencia' ? 'Competência' : 'Caixa'}
          </button>
        ))}
      </div>

      <div className="hidden sm:block w-px h-5 bg-white/10" />

      {/* Natureza */}
      <div className="flex gap-1">
        {([undefined, 'fixo', 'variavel'] as const).map((n) => (
          <button
            key={n || 'all'}
            onClick={() => onNatureza(n)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtros.natureza === n
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {n === undefined ? 'Todos' : n === 'fixo' ? 'Fixo' : 'Variável'}
          </button>
        ))}
      </div>

      <div className="w-full sm:flex-1 sm:min-w-[160px]">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar lançamento..."
            value={localBusca}
            onChange={(e) => {
              setLocalBusca(e.target.value);
              ac.openDropdown();
            }}
            onKeyDown={(e) => ac.handleKeyDown(e, handleBuscaSelect)}
            onBlur={ac.close}
            className="w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
          />
          {localBusca && (
            <button onClick={clearBusca} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X size={12} className="text-slate-500 hover:text-slate-300" />
            </button>
          )}
          {ac.isOpen && (
            <AutocompleteDropdown
              items={ac.items}
              activeIndex={ac.activeIndex}
              query={localBusca}
              onSelect={handleBuscaSelect}
              onMouseEnter={ac.setActiveIndex}
            />
          )}
        </div>
      </div>

      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
      >
        <RefreshCw size={12} />
        Limpar
      </button>
    </div>
  );
}
