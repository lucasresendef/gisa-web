import type { MqttTopics } from '../../types/device';

const env = import.meta.env;

const REQUIRED_ENV = [
  'VITE_MQTT_PROTOCOL',
  'VITE_MQTT_HOST',
  'VITE_MQTT_PORT',
  'VITE_MQTT_ENDPOINT',
  'VITE_MQTT_PUBLISH_TOPIC',
  'VITE_MQTT_STATUS_TOPIC',
  'VITE_MQTT_SENSOR_TOPIC',
  'VITE_MQTT_DOOR_TOPIC',
] as const;

const missing = REQUIRED_ENV.filter((key) => !env[key]);
if (missing.length > 0) {
  console.error(
    `[MQTT] Configuração ausente no .env: ${missing.join(', ')}. ` +
      'Copie o .env.example para .env antes de iniciar.',
  );
}

const port = Number(env.VITE_MQTT_PORT);
if (Number.isNaN(port)) {
  console.error(`[MQTT] VITE_MQTT_PORT inválido: "${env.VITE_MQTT_PORT}". Use um número (ex.: 8084).`);
}

export const mqttConnectionConfig = {
  protocol: env.VITE_MQTT_PROTOCOL,
  host: env.VITE_MQTT_HOST,
  port,
  endpoint: env.VITE_MQTT_ENDPOINT,
  username: env.VITE_MQTT_USERNAME,
  password: env.VITE_MQTT_PASSWORD,
  reconnectPeriod: 4000,
  connectTimeout: 30_000,
  clean: true,
};

export const mqttTopics: MqttTopics = {
  publishTopic: env.VITE_MQTT_PUBLISH_TOPIC,
  statusTopic: env.VITE_MQTT_STATUS_TOPIC,
  sensorTopic: env.VITE_MQTT_SENSOR_TOPIC,
  doorTopic: env.VITE_MQTT_DOOR_TOPIC,
};
