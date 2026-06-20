/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MQTT_PROTOCOL: 'ws' | 'wss';
  readonly VITE_MQTT_HOST: string;
  readonly VITE_MQTT_PORT: string;
  readonly VITE_MQTT_ENDPOINT: string;
  readonly VITE_MQTT_USERNAME?: string;
  readonly VITE_MQTT_PASSWORD?: string;
  readonly VITE_MQTT_PUBLISH_TOPIC: string;
  readonly VITE_MQTT_STATUS_TOPIC: string;
  readonly VITE_MQTT_SENSOR_TOPIC: string;
  readonly VITE_MQTT_DOOR_TOPIC: string;
  readonly VITE_MQTT_TRAVEL_TOPIC: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
