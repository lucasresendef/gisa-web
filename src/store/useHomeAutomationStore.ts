import { create } from 'zustand';
import { devices, initialSyncCommand } from '../config/homeConfig';
import { mqttService } from '../services/mqtt/mqttService';
import type { DeviceState, MqttConnectionStatus } from '../types/device';

interface HomeAutomationState {
  mqttStatus: MqttConnectionStatus;
  mqttError?: string;
  deviceStates: Record<string, DeviceState>;
  connect: () => void;
  disconnect: () => void;
  toggleDevice: (command: string) => void;
  pulseGate: (command: string) => void;
}

const defaultDeviceStates = Object.fromEntries(
  devices.map((device) => [device.id, 'loading']),
) as Record<string, DeviceState>;

let listenersBound = false;
const gateTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const GATE_OPEN_MS = 6000;

export const useHomeAutomationStore = create<HomeAutomationState>((set) => ({
  mqttStatus: 'disconnected',
  deviceStates: defaultDeviceStates,
  connect: () => {
    if (!listenersBound) {
      mqttService.onConnection((status, error) => {
        set({ mqttStatus: status, mqttError: error });
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
          return { deviceStates: next };
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
}));
