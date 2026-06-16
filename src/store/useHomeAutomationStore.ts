import { create } from 'zustand';
import { devices, initialSyncCommand } from '../config/homeConfig';
import { mqttService } from '../services/mqtt/mqttService';
import type { DeviceState, MqttConnectionStatus } from '../types/device';

interface HomeAutomationState {
  mqttStatus: MqttConnectionStatus;
  mqttError?: string;
  syncReceived: boolean;
  deviceStates: Record<string, DeviceState>;
  connect: () => void;
  disconnect: () => void;
  toggleDevice: (command: string) => void;
  pulseGate: (command: string) => void;
  sync: () => void;
}

const defaultDeviceStates = Object.fromEntries(
  devices.map((device) => [device.id, device.kind === 'gate' ? 'off' : 'loading']),
) as Record<string, DeviceState>;

let listenersBound = false;
const gateTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const GATE_OPEN_MS = 6000;

export const useHomeAutomationStore = create<HomeAutomationState>((set) => ({
  mqttStatus: 'disconnected',
  syncReceived: false,
  deviceStates: defaultDeviceStates,
  connect: () => {
    if (!listenersBound) {
      mqttService.onConnection((status, error) => {
        set({ mqttStatus: status, mqttError: error, syncReceived: false });
        if (status === 'connected') {
          mqttService.publishCommand(initialSyncCommand);
        }
      });

      mqttService.onDeviceStatus((updates) => {
        set((state) => {
          const next = { ...state.deviceStates };
          Object.entries(updates).forEach(([id, value]) => {
            next[id] = value === 'true' ? 'on' : 'off';
          });
          return { deviceStates: next, syncReceived: true };
        });
      });

      listenersBound = true;
    }

    mqttService.connectMqtt();
  },
  disconnect: () => {
    mqttService.disconnectMqtt();
  },
  toggleDevice: (command) => {
    set((state) => ({
      deviceStates: {
        ...state.deviceStates,
        [command]: 'loading',
      },
    }));

    mqttService.publishCommand(command);
  },
  pulseGate: (command) => {
    if (gateTimers[command]) clearTimeout(gateTimers[command]);

    set((state) => ({
      deviceStates: { ...state.deviceStates, [command]: 'loading' },
    }));

    mqttService.publishCommand(command);

    gateTimers[command] = setTimeout(() => {
      delete gateTimers[command];
      set((state) => ({
        deviceStates: { ...state.deviceStates, [command]: 'off' },
      }));
    }, GATE_OPEN_MS);
  },
  sync: () => {
    set({ syncReceived: false });
    mqttService.publishCommand(initialSyncCommand);
  },
}));
