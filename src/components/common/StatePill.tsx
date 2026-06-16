import type { DeviceState } from '../../types/device';

interface StatePillProps {
  state: DeviceState;
  variant?: 'relay' | 'gate';
}

const labels: Record<'relay' | 'gate', Record<DeviceState, string>> = {
  relay: { on: 'Ligado', off: 'Desligado', offline: 'Offline', loading: 'Enviando…' },
  gate: { on: 'Aberto', off: 'Fechado', offline: 'Sem sinal', loading: 'Abrindo…' },
};

const dotClass: Record<DeviceState, string> = {
  on: 'bg-brand-500',
  off: 'bg-slate-400 dark:bg-slate-500',
  offline: 'bg-rose-500',
  loading: 'bg-amber-400 animate-pulse',
};

export const StatePill = ({ state, variant = 'relay' }: StatePillProps) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
    <span className={`h-1.5 w-1.5 rounded-full ${dotClass[state]}`} />
    {labels[variant][state]}
  </span>
);
