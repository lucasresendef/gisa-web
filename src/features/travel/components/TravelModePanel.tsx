import { motion } from 'framer-motion';
import { AlarmClockCheck, ArrowRight, Clock3, Pause, Play, ShieldHalf, Sparkles } from 'lucide-react';

interface TravelRoutineStepView {
  id: string;
  label: string;
  note: string;
  durationMs: number;
}

interface TravelModePanelProps {
  active: boolean;
  deviceOnline: boolean;
  currentStepIndex: number;
  remainingMs: number;
  cycleMs: number;
  steps: TravelRoutineStepView[];
  onStart: () => void;
  onStop: () => void;
}

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatMinutes = (ms: number) => {
  const minutes = Math.round(ms / 60000);
  return `${minutes} min`;
};

export const TravelModePanel = ({
  active,
  deviceOnline,
  currentStepIndex,
  remainingMs,
  cycleMs,
  steps,
  onStart,
  onStop,
}: TravelModePanelProps) => {
  const currentStep = steps[currentStepIndex] ?? steps[0];
  const nextStep = steps[(currentStepIndex + 1) % steps.length] ?? steps[0];

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[32px] border border-sky-200/70 bg-[radial-gradient(circle_at_top,#dbeafe,transparent_42%),linear-gradient(135deg,#0f172a_0%,#10294b_52%,#1d4ed8_100%)] p-6 text-white shadow-card"
      >
        <span className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-sky-300/20 blur-3xl" />
        <span className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
              <ShieldHalf className="h-3.5 w-3.5" />
              Modo Viagem
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/80">Ciclo total</p>
              <p className="mt-3 flex items-center gap-2 font-display text-3xl font-extrabold">
                <Clock3 className="h-6 w-6 text-sky-200" />
                {formatMinutes(cycleMs)}
              </p>
              <p className="mt-2 text-sm text-sky-100/80">A sequencia reinicia automaticamente ao final.</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/80">Protecao visual</p>
              <p className="mt-3 flex items-center gap-2 font-display text-3xl font-extrabold">
                <Sparkles className="h-6 w-6 text-amber-200" />
                {steps.length} cenas
              </p>
              <p className="mt-2 text-sm text-sky-100/80">A mesma senha dos portoes libera o modo.</p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="overflow-hidden rounded-[30px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/[0.05]"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">Cena atual</p>
              <h4 className="mt-2 font-display text-2xl font-extrabold text-slate-800 dark:text-white">
                {active ? currentStep.label : 'Rotina em pausa'}
              </h4>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {active
                  ? currentStep.note
                  : 'Ative o modo para alternar as luzes automaticamente e simular movimento na casa.'}
              </p>
            </div>

            <motion.div
              animate={active ? { scale: [1, 1.03, 1] } : { scale: 1 }}
              transition={{ duration: 1.8, repeat: active ? Infinity : 0 }}
              className={`mx-auto flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border text-center sm:mx-0 ${
                active
                  ? 'border-brand-300 bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow'
                  : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.06]'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                {active ? 'Restante' : 'Aguardando'}
              </span>
              <span className="mt-1 font-display text-3xl font-extrabold">
                {active ? formatCountdown(remainingMs) : '--:--'}
              </span>
            </motion.div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-brand-100 bg-brand-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">Proxima luz</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold text-slate-800 dark:text-white">{nextStep.label}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{nextStep.note}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-brand-400" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Status</p>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    active ? 'animate-pulse bg-emerald-500 shadow-[0_0_0_8px_rgba(16,185,129,0.12)]' : 'bg-slate-300'
                  }`}
                />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">
                    {active ? 'Rotina em execucao' : 'Rotina desativada'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {active ? 'A luz atual sera trocada automaticamente no fim do cronometro.' : 'Nenhuma luz sera alternada automaticamente.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
              O controlador continua executando a rotina mesmo se voce sair desta aba.
            </div>

            <button
              type="button"
              disabled={!deviceOnline}
              onClick={active ? onStop : onStart}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-soft transition disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900'
                  : 'bg-gradient-to-r from-brand-400 to-sky-500 text-white'
              }`}
            >
              {active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {active ? 'Parar rotina' : 'Ativar modo viagem'}
            </button>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-[30px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/[0.05]"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Sequencia</p>
              <h4 className="mt-1 font-display text-xl font-bold text-slate-800 dark:text-white">
                Ordem da presenca simulada
              </h4>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
              <AlarmClockCheck className="h-3.5 w-3.5" />
              Loop continuo
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {steps.map((step, index) => {
              const isCurrent = active && index === currentStepIndex;
              const isNext = active && index === (currentStepIndex + 1) % steps.length;

              return (
                <div
                  key={step.id}
                  className={`rounded-3xl border p-4 transition ${
                    isCurrent
                      ? 'border-brand-300 bg-gradient-to-r from-brand-50 to-sky-50 shadow-soft dark:border-brand-400/30 dark:bg-brand-500/10'
                      : isNext
                        ? 'border-sky-200 bg-sky-50/70 dark:border-sky-400/20 dark:bg-sky-500/10'
                        : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Cena {index + 1}
                      </p>
                      <p className="mt-1 font-display text-lg font-bold text-slate-800 dark:text-white">
                        {step.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{step.note}</p>
                    </div>

                    <div className="text-right">
                      <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
                        {formatMinutes(step.durationMs)}
                      </p>
                      <p className="mt-2 text-xs font-medium text-slate-400">
                        {isCurrent ? 'Ligada agora' : isNext ? 'Proxima' : 'Na fila'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
};
