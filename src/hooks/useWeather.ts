import { useEffect, useState } from 'react';
import { fetchCurrentWeather, type WeatherInfo } from '../services/weather/weatherService';
import { pickWeatherPhrase } from '../config/weatherPhrases';

export type WeatherStatus = 'loading' | 'ready' | 'error';

export interface WeatherView extends WeatherInfo {
  phrase: string;
}

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherView | null>(null);
  const [status, setStatus] = useState<WeatherStatus>('loading');

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    fetchCurrentWeather(controller.signal)
      .then((info) => {
        if (cancelled) return;
        setWeather({ ...info, phrase: pickWeatherPhrase(info.condition, info.isDay) });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return { weather, status };
};
