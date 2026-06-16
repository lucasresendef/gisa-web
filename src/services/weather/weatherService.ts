import { codeToCondition, type WeatherCondition } from '../../config/weatherPhrases';

export interface WeatherInfo {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  condition: WeatherCondition;
  city?: string;
}

interface Coords {
  lat: number;
  lon: number;
  city?: string;
}

const fetchJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
};

const getBrowserCoords = (timeout = 8000): Promise<Coords> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation indisponível'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false },
    );
  });

const getIpCoords = async (signal?: AbortSignal): Promise<Coords> => {
  const data = await fetchJson<{ latitude: number; longitude: number; city?: string }>(
    'https://ipapi.co/json/',
    signal,
  );
  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
    throw new Error('localização por IP indisponível');
  }
  return { lat: data.latitude, lon: data.longitude, city: data.city };
};

const resolveLocation = async (signal?: AbortSignal): Promise<Coords> => {
  try {
    return await getBrowserCoords();
  } catch {
    return getIpCoords(signal);
  }
};

const reverseCity = async (lat: number, lon: number, signal?: AbortSignal): Promise<string | undefined> => {
  try {
    const data = await fetchJson<{ city?: string; locality?: string; principalSubdivision?: string }>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`,
      signal,
    );
    return data.city || data.locality || data.principalSubdivision || undefined;
  } catch {
    return undefined;
  }
};

interface OpenMeteoResponse {
  current: { temperature_2m: number; weather_code: number; is_day: number };
}

export const fetchCurrentWeather = async (signal?: AbortSignal): Promise<WeatherInfo> => {
  const location = await resolveLocation(signal);

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
    `&current=temperature_2m,weather_code,is_day`;
  const data = await fetchJson<OpenMeteoResponse>(url, signal);

  const city = location.city ?? (await reverseCity(location.lat, location.lon, signal));

  return {
    temperature: Math.round(data.current.temperature_2m),
    weatherCode: data.current.weather_code,
    isDay: data.current.is_day === 1,
    condition: codeToCondition(data.current.weather_code),
    city,
  };
};
