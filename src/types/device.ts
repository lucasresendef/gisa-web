export type DeviceKind = 'relay' | 'gate';
export type DeviceState = 'on' | 'off' | 'offline' | 'loading';

export type DeviceIcon = 'lightbulb' | 'lamp' | 'door' | 'warehouse';
export type RoomIcon = 'sofa' | 'utensils' | 'bed' | 'car' | 'gate' | 'grid';

export interface Device {
  id: string;
  label: string;
  kind: DeviceKind;
  roomId: string;
  command: string;
  icon: DeviceIcon;
}

export interface Room {
  id: string;
  name: string;
  caption: string;
  icon: RoomIcon;
}

export interface MqttTopics {
  publishTopic: string;
  statusTopic: string;
  sensorTopic: string;
  doorTopic: string;
}

export type MqttConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
