import { create } from 'zustand';
import { devices, initialSyncCommand } from '../config/homeConfig';
import { mqttService } from '../services/mqtt/mqttService';
import type { DeviceState, MqttConnectionStatus } from '../types/device';

interface HomeAutomationState {
  mqttStatus: MqttConnectionStatus;
  mqttError?: string;
  syncReceived: boolean;
  deviceOnline: boolean;
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
const SYNC_TIMEOUT_MS = 10000;
const RECONNECT_INTERVAL_MS = 30000;

let syncTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectTimer: ReturnType<typeof setInterval> | undefined;

const clearSyncTimer = () => {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = undefined;
  }
};

type SetState = (
  partial: Partial<HomeAutomationState> | ((state: HomeAutomationState) => Partial<HomeAutomationState>),
) => void;
type GetState = () => HomeAutomationState;

const armSyncTimer = (set: SetState) => {
  clearSyncTimer();
  syncTimer = setTimeout(() => {
    syncTimer = undefined;
    set((state) => (state.syncReceived ? {} : { deviceOnline: false }));
  }, SYNC_TIMEOUT_MS);
};

const attemptReconnect = (set: SetState, get: GetState) => {
  if (get().deviceOnline) return;

  if (mqttService.isConnected()) {
    set({ syncReceived: false });
    mqttService.publishCommand(initialSyncCommand);
    armSyncTimer(set);
  } else {
    mqttService.reconnect();
  }
};

const stopReconnectLoop = () => {
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = undefined;
  }
};

const startReconnectLoop = (set: SetState, get: GetState) => {
  stopReconnectLoop();
  reconnectTimer = setInterval(() => attemptReconnect(set, get), RECONNECT_INTERVAL_MS);
};

export const useHomeAutomationStore = create<HomeAutomationState>((set, get) => ({
  mqttStatus: 'disconnected',
  syncReceived: false,
  deviceOnline: false,
  deviceStates: defaultDeviceStates,
  connect: () => {
    if (!listenersBound) {
      mqttService.onConnection((status, error) => {
        if (status === 'connected') {
          set({ mqttStatus: status, mqttError: error, syncReceived: false, deviceOnline: true });
          mqttService.publishCommand(initialSyncCommand);
          armSyncTimer(set);
        } else {
          clearSyncTimer();
          set({ mqttStatus: status, mqttError: error, syncReceived: false, deviceOnline: false });
        }
      });

      mqttService.onDeviceStatus((updates) => {
        clearSyncTimer();
        set((state) => {
          const next = { ...state.deviceStates };
          Object.entries(updates).forEach(([id, value]) => {
            next[id] = value === 'true' ? 'on' : 'off';
          });
          return { deviceStates: next, syncReceived: true, deviceOnline: true };
        });
      });

      listenersBound = true;
    }

    mqttService.connectMqtt();
    startReconnectLoop(set, get);
  },
  disconnect: () => {
    clearSyncTimer();
    stopReconnectLoop();
    mqttService.disconnectMqtt();
  },
  toggleDevice: (command) => {
    if (!get().deviceOnline) return;

    set((state) => ({
      deviceStates: {
        ...state.deviceStates,
        [command]: 'loading',
      },
    }));

    mqttService.publishCommand(command);
  },
  pulseGate: (command) => {
    if (!get().deviceOnline) return;

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
    set({ syncReceived: false, deviceOnline: true });
    mqttService.publishCommand(initialSyncCommand);
    armSyncTimer(set);
  },
}));
