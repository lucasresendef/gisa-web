import type { PropsWithChildren } from 'react';
import { Home } from 'lucide-react';
import { ConnectionBadge } from '../common/ConnectionBadge';
import { ThemeToggle } from '../common/ThemeToggle';
import { useTheme } from '../../hooks/useTheme';

export const AppShell = ({ children }: PropsWithChildren) => {
  const { theme, isAuto, toggle } = useTheme();

  return (
    <div className="min-h-screen w-full text-slate-800 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-[#070d1c]/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-soft">
              <Home className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-lg font-extrabold tracking-tight">Gisa</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ConnectionBadge />
            <ThemeToggle theme={theme} isAuto={isAuto} onToggle={toggle} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
    </div>
  );
};
