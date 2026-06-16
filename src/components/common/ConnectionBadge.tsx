import { AlertTriangle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useHomeAutomationStore } from '../../store/useHomeAutomationStore';

const config = {
  connected: {
    text: 'Conectado',
    icon: Wifi,
    className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  connecting: {
    text: 'Conectando',
    icon: Loader2,
    className: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-200',
    dot: 'bg-brand-400',
  },
  disconnected: {
    text: 'Offline',
    icon: WifiOff,
    className: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
  error: {
    text: 'Erro MQTT',
    icon: AlertTriangle,
    className: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
} as const;

export const ConnectionBadge = () => {
  const mqttStatus = useHomeAutomationStore((state) => state.mqttStatus);
  const mqttError = useHomeAutomationStore((state) => state.mqttError);
  const meta = config[mqttStatus];
  const Icon = meta.icon;
  const isConnecting = mqttStatus === 'connecting';

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${meta.className}`}
    >
      <span className="relative flex h-2 w-2">
        {mqttStatus === 'connected' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${meta.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`} />
      </span>
      <Icon className={`h-3.5 w-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">
        {mqttError && mqttStatus === 'error' ? mqttError : meta.text}
      </span>
    </div>
  );
};
