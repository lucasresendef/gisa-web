import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Check, Delete, Lock, ShieldCheck, X } from 'lucide-react';
import type { Device } from '../../../types/device';

type Status = 'idle' | 'error' | 'success';

interface GatePasswordDialogProps {
  gate: Device | null;
  password: string;
  onCancel: () => void;
  onConfirm: (gate: Device) => void;
}

const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const GatePasswordDialog = ({ gate, password, onCancel, onConfirm }: GatePasswordDialogProps) => {
  const [entry, setEntry] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const length = password.length;

  useEffect(() => {
    setEntry('');
    setStatus('idle');
  }, [gate]);

  useEffect(() => {
    if (!gate) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [gate]);

  const validate = useCallback(
    (value: string) => {
      if (value === password) {
        setStatus('success');
        window.setTimeout(() => gate && onConfirm(gate), 700);
      } else {
        setStatus('error');
        window.setTimeout(() => {
          setEntry('');
          setStatus('idle');
        }, 650);
      }
    },
    [password, gate, onConfirm],
  );

  const press = useCallback(
    (digit: string) => {
      if (status !== 'idle') return;
      setEntry((prev) => {
        if (prev.length >= length) return prev;
        const next = prev + digit;
        if (next.length === length) window.setTimeout(() => validate(next), 140);
        return next;
      });
    },
    [status, length, validate],
  );

  const backspace = useCallback(() => {
    if (status !== 'idle') return;
    setEntry((prev) => prev.slice(0, -1));
  }, [status]);

  useEffect(() => {
    if (!gate) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
      else if (event.key === 'Backspace') backspace();
      else if (/^[0-9]$/.test(event.key)) press(event.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gate, onCancel, press, backspace]);

  const dotColor =
    status === 'error'
      ? 'bg-rose-500'
      : status === 'success'
        ? 'bg-emerald-500'
        : 'bg-brand-500';

  return createPortal(
    <AnimatePresence>
      {gate && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1426]/90 sm:p-7"
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-500/30" />

            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancelar"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex flex-col items-center text-center">
              <motion.span
                key={status}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-soft ${
                  status === 'success'
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-500'
                    : status === 'error'
                      ? 'bg-gradient-to-br from-rose-400 to-rose-500'
                      : 'bg-gradient-to-br from-brand-400 to-brand-600'
                }`}
              >
                {status === 'success' ? (
                  <ShieldCheck className="h-7 w-7" />
                ) : (
                  <Lock className="h-6 w-6" />
                )}
              </motion.span>

              <h2 className="mt-4 font-display text-lg font-bold text-slate-800 dark:text-white">
                {status === 'success' ? 'Portão liberado' : 'Confirmar abertura'}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {status === 'success' ? (
                  <span className="font-semibold text-emerald-500">{gate.label}</span>
                ) : (
                  <>
                    Digite a senha para acionar{' '}
                    <span className="font-semibold text-brand-600 dark:text-brand-200">{gate.label}</span>
                  </>
                )}
              </p>

              <motion.div
                animate={status === 'error' ? { x: [0, -9, 9, -7, 7, 0] } : { x: 0 }}
                transition={{ duration: 0.45 }}
                className="mt-6 flex items-center justify-center gap-3.5"
              >
                {Array.from({ length }).map((_, index) => {
                  const filled = index < entry.length;
                  return (
                    <motion.span
                      key={index}
                      animate={{ scale: filled ? 1 : 0.85 }}
                      className={`h-3.5 w-3.5 rounded-full transition-colors duration-200 ${
                        filled ? dotColor : 'bg-slate-200 dark:bg-white/15'
                      }`}
                    />
                  );
                })}
              </motion.div>

              <p
                className={`mt-3 h-4 text-xs font-medium transition-opacity ${
                  status === 'error' ? 'text-rose-500 opacity-100' : 'opacity-0'
                }`}
              >
                Senha incorreta, tente novamente.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex flex-col items-center"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15">
                    <Check className="h-6 w-6" />
                  </span>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Acionando…</p>
                </motion.div>
              ) : (
                <motion.div
                  key="pad"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-5 grid grid-cols-3 gap-2.5"
                >
                  {keypad.map((digit) => (
                    <motion.button
                      key={digit}
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => press(digit)}
                      className="flex h-14 items-center justify-center rounded-2xl border border-slate-200/70 bg-white text-xl font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:border-white/20 dark:hover:bg-white/[0.08]"
                    >
                      {digit}
                    </motion.button>
                  ))}

                  <span aria-hidden />

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => press('0')}
                    className="flex h-14 items-center justify-center rounded-2xl border border-slate-200/70 bg-white text-xl font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:border-white/20 dark:hover:bg-white/[0.08]"
                  >
                    0
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={backspace}
                    aria-label="Apagar"
                    className="flex h-14 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    <Delete className="h-6 w-6" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
