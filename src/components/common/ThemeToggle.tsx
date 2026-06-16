import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import type { Theme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  theme: Theme;
  isAuto: boolean;
  onToggle: () => void;
}

export const ThemeToggle = ({ theme, isAuto, onToggle }: ThemeToggleProps) => {
  const isDark = theme === 'dark';

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onToggle}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={isAuto ? 'Tema automático (pela hora do dia)' : 'Tema manual'}
      className="relative flex h-10 items-center gap-2 rounded-full border border-white/70 bg-white/70 pl-2.5 pr-3 text-slate-600 shadow-soft backdrop-blur transition-colors hover:border-brand-200 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
    >
      <span className="flex h-6 w-6 items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ y: -14, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 14, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.25 }}
          >
            {isDark ? (
              <Moon className="h-[18px] w-[18px] text-brand-200" />
            ) : (
              <Sun className="h-[18px] w-[18px] text-amber-500" />
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="hidden text-[11px] font-bold uppercase tracking-wide sm:inline">
        {isAuto ? 'Auto' : isDark ? 'Escuro' : 'Claro'}
      </span>
    </motion.button>
  );
};
