import { create } from 'zustand';
import { devices, initialSyncCommand } from '../config/homeConfig';
import { mqttTopics } from '../services/mqtt/mqttConfig';
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
const SENSOR_SETTLE_MS = 3000;

let syncTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectTimer: ReturnType<typeof setInterval> | undefined;
const relayHoldUntil: Record<string, number> = {};
const relayHeldState: Record<string, 'on' | 'off'> = {};

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

const resolveHeldRelayState = (id: string, nextState: 'on' | 'off') => {
  const holdUntil = relayHoldUntil[id] ?? 0;
  if (holdUntil <= Date.now()) {
    delete relayHoldUntil[id];
    delete relayHeldState[id];
    return nextState;
  }

  const heldState = relayHeldState[id];
  return heldState && heldState !== nextState ? heldState : nextState;
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

      mqttService.onDeviceStatus((topic, updates) => {
        clearSyncTimer();
        set((state) => {
          const next = { ...state.deviceStates };
          Object.entries(updates).forEach(([id, value]) => {
            const nextState = value === 'true' ? 'on' : 'off';
            if (topic === mqttTopics.doorTopic) {
              next[id] = nextState;
              return;
            }
            next[id] = resolveHeldRelayState(id, nextState);
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

    const current = get().deviceStates[command];
    const nextState: 'on' | 'off' = current === 'on' ? 'off' : 'on';
    relayHoldUntil[command] = Date.now() + SENSOR_SETTLE_MS;
    relayHeldState[command] = nextState;

    set((state) => ({
      deviceStates: {
        ...state.deviceStates,
        [command]: nextState,
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
