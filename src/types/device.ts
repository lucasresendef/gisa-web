export type DeviceKind = 'relay' | 'gate';
export type DeviceState = 'on' | 'off' | 'offline' | 'loading';

export type DeviceIcon = 'lightbulb' | 'lamp' | 'door' | 'warehouse';
export type RoomIcon = 'sofa' | 'utensils' | 'bed' | 'car' | 'gate' | 'grid' | 'travel';

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
  travelTopic: string;
}

export type MqttConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface TravelModeStatus {
  enabled: boolean;
  currentDeviceId?: string;
  nextDeviceId?: string;
  stepIndex: number;
  remainingSec: number;
  durationSec: number;
  updatedAt: number;
}
