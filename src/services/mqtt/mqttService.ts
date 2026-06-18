import mqtt, { type MqttClient } from 'mqtt';
import { mqttConnectionConfig, mqttTopics } from './mqttConfig';
import { parseMqttPayload } from '../../utils/mqttParser';
import type { MqttConnectionStatus } from '../../types/device';

export type DeviceStatusListener = (status: Record<string, string>) => void;
export type ConnectionListener = (status: MqttConnectionStatus, error?: string) => void;

class MqttService {
  private client: MqttClient | null = null;
  private readonly listeners = new Set<DeviceStatusListener>();
  private readonly connectionListeners = new Set<ConnectionListener>();

  connectMqtt() {
    if (this.client?.connected) return;

    const { protocol, host, port, endpoint, ...options } = mqttConnectionConfig;
    const connectUrl = `${protocol}://${host}:${port}${endpoint}`;

    this.emitConnection('connecting');

    this.client = mqtt.connect(connectUrl, {
      ...options,
      clientId: `gisa_react_${Math.random().toString(16).slice(2, 8)}`,
    });

    this.client.on('connect', () => {
      this.emitConnection('connected');
      this.subscribeToDeviceStatus();
    });

    this.client.on('reconnect', () => this.emitConnection('connecting'));

    this.client.on('close', () => this.emitConnection('disconnected'));

    this.client.on('error', (error) => {
      this.emitConnection('error', error.message);
    });

    this.client.on('message', (_topic, message) => {
      const parsed = parseMqttPayload(message.toString());
      if (Object.keys(parsed).length) {
        this.listeners.forEach((listener) => listener(parsed));
      }
    });
  }

  disconnectMqtt() {
    this.client?.end();
    this.client = null;
    this.emitConnection('disconnected');
  }

  isConnected() {
    return this.client?.connected ?? false;
  }

  reconnect() {
    if (!this.client) {
      this.connectMqtt();
      return;
    }

    if (!this.client.connected) {
      this.emitConnection('connecting');
      this.client.reconnect();
    }
  }

  subscribeToDeviceStatus() {
    if (!this.client) return;

    [mqttTopics.statusTopic, mqttTopics.sensorTopic, mqttTopics.doorTopic].forEach((topic) => {
      this.client?.subscribe(topic, { qos: 0 });
    });
  }

  publishCommand(command: string) {
    if (!this.client?.connected) {
      this.emitConnection('error', 'Cliente MQTT desconectado');
      return;
    }

    this.client.publish(mqttTopics.publishTopic, command, { qos: 0 });
  }

  onDeviceStatus(listener: DeviceStatusListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onConnection(listener: ConnectionListener) {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  private emitConnection(status: MqttConnectionStatus, error?: string) {
    this.connectionListeners.forEach((listener) => listener(status, error));
  }
}

export const mqttService = new MqttService();
