import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Loader2, Mic, MicOff, Sparkles, X } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { exampleCommands, type VoiceFeedback } from '../../../config/voiceCommands';
import { speak, stopSpeaking } from '../../../services/voice/speech';

type Phase = 'intro' | 'listening' | 'processing' | 'result' | 'unsupported';

interface VoiceAssistantProps {
  open: boolean;
  onClose: () => void;
  onProcess: (transcript: string) => VoiceFeedback;
}

const accentByStatus: Record<VoiceFeedback['status'], string> = {
  success: 'from-emerald-400 to-emerald-500',
  info: 'from-brand-400 to-brand-600',
  gate: 'from-brand-400 to-brand-600',
  error: 'from-rose-400 to-rose-500',
};

export const VoiceAssistant = ({ open, onClose, onProcess }: VoiceAssistantProps) => {
  const {
    transcript,
    interimTranscript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  const [phase, setPhase] = useState<Phase>('intro');
  const [feedback, setFeedback] = useState<VoiceFeedback | null>(null);
  const processedRef = useRef(false);

  const secureContext = typeof window !== 'undefined' && window.isSecureContext;
  const supported = browserSupportsSpeechRecognition && secureContext;

  const beginListening = useCallback(() => {
    setFeedback(null);
    processedRef.current = false;
    resetTranscript();
    stopSpeaking();
    setPhase('listening');
    SpeechRecognition.startListening({ language: 'pt-BR', continuous: false });
  }, [resetTranscript]);

  const finish = useCallback(
    (text: string) => {
      if (processedRef.current) return;
      processedRef.current = true;
      SpeechRecognition.stopListening();
      setPhase('processing');
      window.setTimeout(() => {
        const result = onProcess(text);
        setFeedback(result);
        setPhase('result');
        speak(result.message);
        if (result.status === 'gate') window.setTimeout(onClose, 1700);
      }, 450);
    },
    [onProcess, onClose],
  );

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    processedRef.current = false;
    resetTranscript();

    if (!supported) {
      setPhase('unsupported');
      return;
    }

    setPhase('listening');
    SpeechRecognition.startListening({ language: 'pt-BR', continuous: false });

    return () => {
      SpeechRecognition.abortListening();
      stopSpeaking();
    };
  }, [open, supported, resetTranscript]);

  useEffect(() => {
    if (open && supported && !isMicrophoneAvailable) {
      setFeedback({
        status: 'error',
        message: 'Não consegui acessar o microfone. Permita o acesso no navegador e toque de novo.',
      });
      setPhase('result');
    }
  }, [open, supported, isMicrophoneAvailable]);

  useEffect(() => {
    if (phase === 'listening' && finalTranscript) finish(finalTranscript);
  }, [phase, finalTranscript, finish]);

  const heard = interimTranscript || transcript;
  const accent = feedback ? accentByStatus[feedback.status] : 'from-brand-400 to-brand-600';
  const orbClickable = phase === 'intro' || phase === 'listening' || phase === 'result';
  const showRings = phase === 'intro' || phase === 'listening';

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
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-7 text-center shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1426]/90"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
              {showRings &&
                [0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute rounded-full bg-brand-400/30 dark:bg-brand-400/25"
                    initial={{ width: 72, height: 72, opacity: 0.55 }}
                    animate={{ width: 168, height: 168, opacity: 0 }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: 'easeOut' }}
                  />
                ))}

              <motion.button
                type="button"
                onClick={beginListening}
                disabled={!orbClickable}
                aria-label="Tocar para falar"
                className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-white shadow-glow ${orbClickable ? 'cursor-pointer' : 'cursor-default'}`}
                whileTap={orbClickable ? { scale: 0.92 } : undefined}
                animate={
                  phase === 'listening'
                    ? { scale: [1, 1.08, 1] }
                    : phase === 'intro'
                      ? { scale: [1, 1.04, 1] }
                      : { scale: 1 }
                }
                transition={{ duration: 1.4, repeat: showRings ? Infinity : 0 }}
              >
                {phase === 'processing' ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : phase === 'unsupported' ? (
                  <MicOff className="h-8 w-8" />
                ) : phase === 'result' && feedback?.status !== 'error' ? (
                  <Sparkles className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </motion.button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={phase + (feedback?.message ?? '')}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mt-6"
              >
                {phase === 'unsupported' ? (
                  <>
                    <h2 className="font-display text-xl font-bold text-slate-800 dark:text-white">
                      Olá, eu sou a Gisa
                    </h2>
                    <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                      Seu navegador não suporta reconhecimento de voz. Tente no Chrome (computador ou
                      Android). No iPhone essa função ainda é instável.
                    </p>
                  </>
                ) : phase === 'result' && feedback ? (
                  <>
                    <h2 className="font-display text-xl font-bold text-slate-800 dark:text-white">
                      {feedback.status === 'error' ? 'Hmm…' : 'Gisa'}
                    </h2>
                    <p className="mx-auto mt-2 max-w-xs text-sm font-medium text-slate-600 dark:text-slate-300">
                      {feedback.message}
                    </p>
                    {heard && (
                      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                        Você disse: “{heard}”
                      </p>
                    )}
                  </>
                ) : phase === 'processing' ? (
                  <>
                    <h2 className="font-display text-xl font-bold text-slate-800 dark:text-white">
                      Entendi, um instante…
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">“{heard}”</p>
                  </>
                ) : phase === 'listening' ? (
                  <>
                    <h2 className="font-display text-xl font-bold text-slate-800 dark:text-white">
                      {listening ? 'Estou ouvindo…' : 'Toque no microfone'}
                    </h2>
                    <p className="mt-2 min-h-5 text-sm font-medium text-brand-600 dark:text-brand-200">
                      {heard || (listening ? 'Pode falar 🎙️' : 'Toque para falar de novo')}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="font-display text-xl font-bold text-slate-800 dark:text-white">
                      Olá, eu sou a Gisa
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Toque no microfone e fale o que precisa.
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {(phase === 'intro' || phase === 'listening' || phase === 'unsupported') && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {exampleCommands.map((example) => (
                  <span
                    key={example}
                    className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-medium text-brand-600 dark:bg-white/[0.06] dark:text-brand-200"
                  >
                    {example}
                  </span>
                ))}
              </div>
            )}

            {(phase === 'intro' || phase === 'result') && supported && (
              <button
                type="button"
                onClick={beginListening}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-soft transition active:scale-95"
              >
                <Mic className="h-4 w-4" />
                {phase === 'result' ? 'Falar de novo' : 'Falar'}
              </button>
            )}

            {phase === 'listening' && (
              <p className="mt-5 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                <span className={`h-2 w-2 rounded-full ${listening ? 'animate-pulse bg-rose-500' : 'bg-slate-300'}`} />
                {listening ? 'Microfone ativo' : 'Microfone parado — toque para falar'}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
