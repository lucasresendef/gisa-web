import { motion } from 'framer-motion';
import {
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Moon,
  Sun,
} from 'lucide-react';
import { conditionIcon, conditionLabel, type WeatherIconName } from '../../../config/weatherPhrases';
import type { WeatherStatus, WeatherView } from '../../../hooks/useWeather';

const iconMap: Record<WeatherIconName, typeof Sun> = {
  sun: Sun,
  moon: Moon,
  'cloud-sun': CloudSun,
  'cloud-moon': CloudMoon,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  thunder: CloudLightning,
};

interface WeatherChipProps {
  weather: WeatherView | null;
  status: WeatherStatus;
}

const shell =
  'inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200';

export const WeatherChip = ({ weather, status }: WeatherChipProps) => {
  if (status === 'error') return null;

  if (status === 'loading' || !weather) {
    return (
      <span className={shell}>
        <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-brand-200 dark:bg-white/20" />
        <span className="text-slate-400 dark:text-slate-500">Buscando o clima…</span>
      </span>
    );
  }

  const Icon = iconMap[conditionIcon(weather.condition, weather.isDay)];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={shell}
    >
      <Icon className="h-4 w-4 text-brand-500 dark:text-brand-300" />
      <span className="text-slate-700 dark:text-white">{weather.temperature}°</span>
      <span className="text-slate-300 dark:text-slate-600">·</span>
      <span>{conditionLabel(weather.condition, weather.isDay)}</span>
      {weather.city && (
        <>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-slate-400 dark:text-slate-500" />
            {weather.city}
          </span>
        </>
      )}
    </motion.span>
  );
};
