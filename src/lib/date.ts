import { FiltrosDashboard } from '@/types/financeiro';

export function getPresetPeriodo(preset: FiltrosDashboard['preset']): { inicio: string; fim: string } {
  const hoje = new Date();
  const y = hoje.getFullYear();
  const m = hoje.getMonth();

  switch (preset) {
    case 'mes_atual':
      return {
        inicio: new Date(y, m, 1).toISOString().slice(0, 10),
        fim: new Date(y, m + 1, 0).toISOString().slice(0, 10),
      };
    case 'proximo_mes':
      return {
        inicio: new Date(y, m + 1, 1).toISOString().slice(0, 10),
        fim: new Date(y, m + 2, 0).toISOString().slice(0, 10),
      };
    case 'mes_anterior':
      return {
        inicio: new Date(y, m - 1, 1).toISOString().slice(0, 10),
        fim: new Date(y, m, 0).toISOString().slice(0, 10),
      };
    case 'ultimos_3m':
      return {
        inicio: new Date(y, m - 2, 1).toISOString().slice(0, 10),
        fim: new Date(y, m + 1, 0).toISOString().slice(0, 10),
      };
    case 'ultimos_12m':
      return {
        inicio: new Date(y, m - 11, 1).toISOString().slice(0, 10),
        fim: new Date(y, m + 1, 0).toISOString().slice(0, 10),
      };
    case 'ano':
      return {
        inicio: new Date(y, 0, 1).toISOString().slice(0, 10),
        fim: new Date(y, 11, 31).toISOString().slice(0, 10),
      };
    default:
      return {
        inicio: new Date(y, m, 1).toISOString().slice(0, 10),
        fim: new Date(y, m + 1, 0).toISOString().slice(0, 10),
      };
  }
}

export function addMonths(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

export function isInPeriod(dateStr: string, inicio: string, fim: string): boolean {
  return dateStr >= inicio && dateStr <= fim;
}

export function getMesKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}
