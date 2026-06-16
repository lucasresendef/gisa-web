import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ToggleSwitchProps {
  on: boolean;
  loading?: boolean;
}

export const ToggleSwitch = ({ on, loading = false }: ToggleSwitchProps) => (
  <span
    aria-hidden
    className={`relative flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-300 ${
      on
        ? 'justify-end bg-gradient-to-r from-brand-400 to-brand-500 shadow-soft'
        : 'justify-start bg-slate-200 dark:bg-white/10'
    }`}
  >
    <motion.span
      layout
      transition={{ type: 'spring', stiffness: 600, damping: 32 }}
      className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-brand-500 shadow-md"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
    </motion.span>
  </span>
);
