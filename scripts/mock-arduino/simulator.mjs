import mqtt from 'mqtt';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '../..');

function loadEnv(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  } catch {
    return env;
  }
  return env;
}

const env = loadEnv(resolve(projectRoot, '.env'));

const PROTOCOL = env.VITE_MQTT_PROTOCOL || 'wss';
const HOST = env.VITE_MQTT_HOST || 'broker.emqx.io';
const PORT = env.VITE_MQTT_PORT || '8084';
const ENDPOINT = env.VITE_MQTT_ENDPOINT || '/mqtt';
const USERNAME = env.VITE_MQTT_USERNAME || 'emqx';
const PASSWORD = env.VITE_MQTT_PASSWORD || 'public';

const TOPICS = {
  publish: env.VITE_MQTT_PUBLISH_TOPIC || 'gisa/rele',
  status: env.VITE_MQTT_STATUS_TOPIC || 'rele/status',
  sensor: env.VITE_MQTT_SENSOR_TOPIC || 'rele/sensor',
  door: env.VITE_MQTT_DOOR_TOPIC || 'rele/door',
  travel: env.VITE_MQTT_TRAVEL_TOPIC || 'rele/travel',
};

const BROKER_URL = process.env.SIM_MQTT_URL || `${PROTOCOL}://${HOST}:${PORT}${ENDPOINT}`;
const SYNC_COMMAND = 'VA';
const TRAVEL_ON_COMMAND = 'TV_ON';
const TRAVEL_OFF_COMMAND = 'TV_OFF';
const GATE_CLOSE_MS = Number(process.env.SIM_GATE_CLOSE || 6000);
const DEMO_INTERVAL_MS = Number(process.env.SIM_DEMO_INTERVAL || 4000);
const CYCLE_INTERVAL_MS = Number(process.env.SIM_CYCLE_INTERVAL || 3000);
const DEMO = process.argv.includes('--demo');
const CYCLE = process.argv.includes('--cycle');

const BEDROOM_LIGHTS = ['R1', 'R4', 'R6', 'R10', 'R3', 'R9'];

const RELAYS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'];
const GATES = ['P1', 'P2', 'P3'];
const TRAVEL_STEPS = [
  { id: 'R2', durationMs: 5 * 60_000 },
  { id: 'R5', durationMs: 4 * 60_000 },
  { id: 'R3', durationMs: 3 * 60_000 },
  { id: 'R4', durationMs: 5 * 60_000 },
  { id: 'R7', durationMs: 3 * 60_000 },
];

const state = {};
[...RELAYS, ...GATES].forEach((id) => (state[id] = false));
const gateTimers = {};
let travelMode = {
  enabled: false,
  index: 0,
  startedAt: 0,
  endsAt: 0,
  timer: null,
};

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  blue: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};
const ts = () => new Date().toLocaleTimeString('pt-BR');
const log = (msg) => console.log(`${c.dim(ts())}  ${msg}`);

console.log(c.bold('\n  🔌 Simulador Arduino Mega — Gisa Home\n'));
log(`Conectando em ${c.blue(BROKER_URL)} …`);

const client = mqtt.connect(BROKER_URL, {
  username: USERNAME,
  password: PASSWORD,
  clientId: `gisa_mock_${Math.random().toString(16).slice(2, 8)}`,
  reconnectPeriod: 4000,
  connectTimeout: 30_000,
  clean: true,
});

client.on('connect', () => {
  log(c.green('✅ Conectado ao broker'));
  client.subscribe(TOPICS.publish, (err) => {
    if (err) return log(c.red(`Falha ao assinar ${TOPICS.publish}: ${err.message}`));
    log(`👂 Ouvindo comandos em ${c.bold(TOPICS.publish)}`);
    publishSnapshot();
    log(c.dim('   (snapshot inicial enviado — a interface deve sair de "carregando")'));
    if (DEMO) startDemo();
    if (CYCLE) startBedroomCycle();
  });
});

client.on('reconnect', () => log(c.yellow('… reconectando')));
client.on('close', () => log(c.dim('conexão encerrada')));
client.on('error', (err) => log(c.red(`Erro MQTT: ${err.message}`)));

client.on('message', (topic, payload) => {
  if (topic !== TOPICS.publish) return;
  handleCommand(payload.toString().trim());
});

function handleCommand(command) {
  if (!command) return;

  if (command.toUpperCase() === SYNC_COMMAND) {
    publishSnapshot();
    log(`◀ ${c.bold('VA')} (sincronizar) → snapshot completo enviado`);
    return;
  }

  if (command.toUpperCase() === TRAVEL_ON_COMMAND) {
    startTravelMode();
    return;
  }

  if (command.toUpperCase() === TRAVEL_OFF_COMMAND) {
    stopTravelMode(true);
    return;
  }

  if (RELAYS.includes(command)) {
    if (travelMode.enabled) {
      const activeId = TRAVEL_STEPS[travelMode.index]?.id;
      stopTravelMode(activeId !== command);
    }
    state[command] = !state[command];
    publish([command]);
    log(`◀ ${c.bold(command)} → ${state[command] ? c.green('LIGADO') : c.dim('desligado')}`);
    return;
  }

  if (GATES.includes(command)) {
    openGate(command);
    return;
  }

  log(c.yellow(`◀ comando desconhecido: "${command}" (ignorado)`));
}

function openGate(gate) {
  if (gateTimers[gate]) clearTimeout(gateTimers[gate]);
  state[gate] = true;
  publish([gate]);
  log(`◀ ${c.bold(gate)} → ${c.green('ABERTO')} ${c.dim(`(fecha em ${GATE_CLOSE_MS / 1000}s)`)}`);

  gateTimers[gate] = setTimeout(() => {
    state[gate] = false;
    publish([gate]);
    gateTimers[gate] = null;
    log(`  ${c.bold(gate)} → ${c.dim('FECHADO (automático)')}`);
  }, GATE_CLOSE_MS);
}

function publish(ids) {
  const relays = {};
  const gates = {};
  for (const id of ids) {
    if (GATES.includes(id)) gates[id] = state[id];
    else relays[id] = state[id];
  }
  if (Object.keys(relays).length) client.publish(TOPICS.status, JSON.stringify(relays), { qos: 0 });
  if (Object.keys(gates).length) client.publish(TOPICS.door, JSON.stringify(gates), { qos: 0 });
}

function publishSnapshot() {
  publish([...RELAYS, ...GATES]);
  publishTravelStatus();
}

function publishTravelStatus() {
  const payload = travelMode.enabled
    ? JSON.stringify({
        enabled: true,
        current: TRAVEL_STEPS[travelMode.index].id,
        next: TRAVEL_STEPS[(travelMode.index + 1) % TRAVEL_STEPS.length].id,
        remaining: Math.max(0, Math.ceil((travelMode.endsAt - Date.now()) / 1000)),
        duration: Math.round(TRAVEL_STEPS[travelMode.index].durationMs / 1000),
        index: travelMode.index,
      })
    : JSON.stringify({
        enabled: false,
        current: '',
        next: '',
        remaining: 0,
        duration: 0,
        index: 0,
      });
  client.publish(TOPICS.travel, payload, { qos: 0 });
}

function resetTravelLights() {
  for (const { id } of TRAVEL_STEPS) {
    if (!state[id]) continue;
    state[id] = false;
    publish([id]);
  }
}

function activateTravelStep(index) {
  travelMode.enabled = true;
  travelMode.index = index % TRAVEL_STEPS.length;
  travelMode.startedAt = Date.now();
  travelMode.endsAt = travelMode.startedAt + TRAVEL_STEPS[travelMode.index].durationMs;

  const currentId = TRAVEL_STEPS[travelMode.index].id;
  state[currentId] = true;
  publish([currentId]);
  publishTravelStatus();
  log(`✈ ${c.bold(currentId)} → ${c.green('LIGADO')} ${c.dim(`(${TRAVEL_STEPS[travelMode.index].durationMs / 60000} min)`)}`);

  travelMode.timer = setTimeout(() => {
    const previousId = TRAVEL_STEPS[travelMode.index].id;
    state[previousId] = false;
    publish([previousId]);
    activateTravelStep((travelMode.index + 1) % TRAVEL_STEPS.length);
  }, TRAVEL_STEPS[travelMode.index].durationMs);
}

function startTravelMode() {
  if (travelMode.enabled) {
    publishTravelStatus();
    return;
  }
  resetTravelLights();
  activateTravelStep(0);
  log(c.yellow('✈ modo viagem ativado'));
}

function stopTravelMode(turnOffCurrent) {
  if (travelMode.timer) clearTimeout(travelMode.timer);
  travelMode.timer = null;

  if (travelMode.enabled && turnOffCurrent) {
    const currentId = TRAVEL_STEPS[travelMode.index].id;
    state[currentId] = false;
    publish([currentId]);
  }

  travelMode = {
    enabled: false,
    index: 0,
    startedAt: 0,
    endsAt: 0,
    timer: null,
  };
  publishTravelStatus();
  log(c.yellow('✈ modo viagem desativado'));
}

function startDemo() {
  log(c.yellow(`🎬 Modo demo ativo — alterando dispositivos a cada ${DEMO_INTERVAL_MS / 1000}s`));
  setInterval(() => {
    const id = RELAYS[Math.floor(Math.random() * RELAYS.length)];
    state[id] = !state[id];
    publish([id]);
    log(`🎲 demo ${c.bold(id)} → ${state[id] ? c.green('LIGADO') : c.dim('desligado')}`);
  }, DEMO_INTERVAL_MS);
}

function startBedroomCycle() {
  log(c.yellow(`🔁 Modo ciclo — acende uma luz dos quartos a cada ${CYCLE_INTERVAL_MS / 1000}s`));
  let index = 0;
  let previous = null;
  const step = () => {
    if (previous) {
      state[previous] = false;
      publish([previous]);
    }
    const id = BEDROOM_LIGHTS[index % BEDROOM_LIGHTS.length];
    state[id] = true;
    publish([id]);
    log(`🔁 ciclo ${c.bold(id)} → ${c.green('LIGADO')}${previous ? c.dim(` (apaguei ${previous})`) : ''}`);
    previous = id;
    index += 1;
  };
  step();
  setInterval(step, CYCLE_INTERVAL_MS);
}

function shutdown() {
  log(c.dim('encerrando…'));
  Object.values(gateTimers).forEach((t) => t && clearTimeout(t));
  if (travelMode.timer) clearTimeout(travelMode.timer);
  client.end(true, () => process.exit(0));
  setTimeout(() => process.exit(0), 1000);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
