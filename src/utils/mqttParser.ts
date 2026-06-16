export const parseMqttPayload = (raw: string): Record<string, string> => {
  const sanitized = raw.replace(/'/g, '"');
  const candidate = sanitized.includes('/') ? sanitized.split('/')[0] : sanitized;

  try {
    const parsed = JSON.parse(candidate) as Record<string, string | boolean>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value)]),
    );
  } catch {
    return {};
  }
};
