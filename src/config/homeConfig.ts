import type { Device, Room } from '../types/device';

export const rooms: Room[] = [
  { id: 'gates', name: 'Portões', caption: 'Controle de portões', icon: 'gate' },
  { id: 'living', name: 'Sala', caption: 'Estar e iluminação', icon: 'sofa' },
  { id: 'kitchen', name: 'Cozinha', caption: 'Cozinha e corredor', icon: 'utensils' },
  { id: 'bedroom', name: 'Quartos', caption: 'Dormitórios e corredor', icon: 'bed' },
  { id: 'garage', name: 'Garagem', caption: 'Acesso de veículos', icon: 'car' },
  { id: 'all', name: 'Todos', caption: 'Todos os ambientes', icon: 'grid' },
  { id: 'travel', name: 'Viagem', caption: 'Rotina visual para simular presença', icon: 'travel' },
];

export const devices: Device[] = [
  { id: 'R5', label: 'Sala', kind: 'relay', roomId: 'living', command: 'R5', icon: 'lightbulb' },

  { id: 'R8', label: 'Cozinha', kind: 'relay', roomId: 'kitchen', command: 'R8', icon: 'lightbulb' },
  { id: 'R7', label: 'Corredor Cozinha', kind: 'relay', roomId: 'kitchen', command: 'R7', icon: 'lightbulb' },

  { id: 'R6', label: 'Quarto Anicézio e Gislaine', kind: 'relay', roomId: 'bedroom', command: 'R6', icon: 'lightbulb' },
  { id: 'R1', label: 'Quarto Noah', kind: 'relay', roomId: 'bedroom', command: 'R1', icon: 'lightbulb' },
  { id: 'R4', label: 'Quarto Sara', kind: 'relay', roomId: 'bedroom', command: 'R4', icon: 'lightbulb' },
  { id: 'R9', label: 'Luminária Sara', kind: 'relay', roomId: 'bedroom', command: 'R9', icon: 'lamp' },
  { id: 'R10', label: 'Quarto Queven', kind: 'relay', roomId: 'bedroom', command: 'R10', icon: 'lightbulb' },
  { id: 'R3', label: 'Corredor Quartos', kind: 'relay', roomId: 'bedroom', command: 'R3', icon: 'lightbulb' },

  { id: 'R2', label: 'Garagem', kind: 'relay', roomId: 'garage', command: 'R2', icon: 'lightbulb' },

  { id: 'P1', label: 'Portão 1', kind: 'gate', roomId: 'gates', command: 'P1', icon: 'warehouse' },
  { id: 'P2', label: 'Portão 2', kind: 'gate', roomId: 'gates', command: 'P2', icon: 'warehouse' },
  { id: 'P3', label: 'Portão do meio', kind: 'gate', roomId: 'gates', command: 'P3', icon: 'door' },
];

export const devicesByRoom = (roomId: string) =>
  devices.filter((device) => device.roomId === roomId);

export const gatePassword = '1134';

export const initialSyncCommand = 'VA';

export const travelRoutineSteps = [
  { deviceId: 'R2', durationMs: 5 * 60_000, note: 'Garagem visivel da rua' },
  { deviceId: 'R5', durationMs: 4 * 60_000, note: 'Sala principal em evidencia' },
  { deviceId: 'R3', durationMs: 3 * 60_000, note: 'Corredor dos quartos com passagem simulada' },
  { deviceId: 'R4', durationMs: 5 * 60_000, note: 'Quarto da Sara com permanencia mais longa' },
  { deviceId: 'R7', durationMs: 3 * 60_000, note: 'Cozinha e corredor lateral ativos' },
] as const;
