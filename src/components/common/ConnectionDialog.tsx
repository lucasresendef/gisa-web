import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CheckCircle2, Loader2, RefreshCw, Wifi, WifiOff, X } from 'lucide-react';
import { mqttConnectionConfig } from '../../services/mqtt/mqttConfig';
import { useHomeAutomationStore } from '../../store/useHomeAutomationStore';
import type { MqttConnectionStatus } from '../../types/device';

interface ConnectionDialogProps {
  open: boolean;
  onClose: () => void;
}

const statusMeta: Record<MqttConnectionStatus, { label: string; dot: string; text: string }> = {
  connected: {
    label: 'Conectado',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-300',
  },
  connecting: { label: 'Conectando…', dot: 'bg-brand-400', text: 'text-brand-600 dark:text-brand-200' },
  disconnected: {
    label: 'Desconectado',
    dot: 'bg-slate-400',
    text: 'text-slate-500 dark:text-slate-300',
  },
  error: { label: 'Erro', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-300' },
};

export const ConnectionDialog = ({ open, onClose }: ConnectionDialogProps) => {
  const mqttStatus = useHomeAutomationStore((s) => s.mqttStatus);
  const mqttError = useHomeAutomationStore((s) => s.mqttError);
  const syncReceived = useHomeAutomationStore((s) => s.syncReceived);
  const sync = useHomeAutomationStore((s) => s.sync);

  const connected = mqttStatus === 'connected';
  const meta = statusMeta[mqttStatus];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1426]/90 sm:p-7"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-soft ${
                  connected
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-500'
                    : 'bg-gradient-to-br from-slate-400 to-slate-500'
                }`}
              >
                {connected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-800 dark:text-white">Conexão</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Status do MQTT e do Arduino</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">MQTT</span>
                <span className={`inline-flex items-center gap-2 text-sm font-semibold ${meta.text}`}>
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  {mqttError && mqttStatus === 'error' ? mqttError : meta.label}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Broker</span>
                <span className="truncate pl-3 text-sm font-semibold text-slate-700 dark:text-slate-100">
                  {mqttConnectionConfig.host}
                </span>
              </div>

              <div
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                  syncReceived
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-400/30 dark:bg-emerald-500/10'
                    : 'border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-500/10'
                }`}
              >
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Resposta do Arduino (VA)
                </span>
                {syncReceived ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Recebida
                  </span>
                ) : connected ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aguardando…
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">—</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={sync}
              disabled={!connected}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-soft transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Sincronizar (enviar VA)
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
