import { useCallback, useEffect, useRef, useState } from 'react';

export type Theme = 'light' | 'dark';

const DAY_START = 6;
const NIGHT_START = 18;

export const themeForHour = (hour: number): Theme =>
  hour >= DAY_START && hour < NIGHT_START ? 'light' : 'dark';

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => themeForHour(new Date().getHours()));
  const [isAuto, setIsAuto] = useState(true);
  const isAutoRef = useRef(isAuto);
  isAutoRef.current = isAuto;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!isAuto) return;
    const tick = () => {
      if (!isAutoRef.current) return;
      setThemeState(themeForHour(new Date().getHours()));
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [isAuto]);

  const toggle = useCallback(() => {
    setIsAuto(false);
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const useAuto = useCallback(() => {
    setIsAuto(true);
    setThemeState(themeForHour(new Date().getHours()));
  }, []);

  return { theme, isAuto, toggle, useAuto };
};
