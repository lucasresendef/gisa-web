import { useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useHomeAutomationStore } from '../../store/useHomeAutomationStore';
import { ConnectionDialog } from './ConnectionDialog';
import type { MqttConnectionStatus } from '../../types/device';

const iconColor: Record<MqttConnectionStatus, string> = {
  connected: 'text-emerald-500',
  connecting: 'text-brand-400 animate-pulse',
  disconnected: 'text-slate-400 dark:text-slate-500',
  error: 'text-rose-500',
};

export const ConnectionBadge = () => {
  const mqttStatus = useHomeAutomationStore((state) => state.mqttStatus);
  const [open, setOpen] = useState(false);

  const connected = mqttStatus === 'connected';
  const offline = mqttStatus === 'disconnected' || mqttStatus === 'error';
  const Icon = offline ? WifiOff : Wifi;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Status da conexão"
        title={connected ? 'Conectado' : 'Ver conexão'}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/70 shadow-soft backdrop-blur transition hover:border-brand-200 dark:border-white/10 dark:bg-white/[0.06]"
      >
        {connected && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
        <Icon className={`h-[18px] w-[18px] ${iconColor[mqttStatus]}`} />
      </button>

      <ConnectionDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};
