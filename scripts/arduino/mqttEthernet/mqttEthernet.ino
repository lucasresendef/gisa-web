#include <SPI.h>
#include <Ethernet.h>
#include <PubSubClient.h>
#include <SerialRelay.h>

#define DEBUG 1
#if DEBUG
#define LOG(x) Serial.print(x)
#define LOGLN(x) Serial.println(x)
#else
#define LOG(x)
#define LOGLN(x)
#endif

byte mac[] = { 0x70, 0xB3, 0xD5, 0x0A, 0xCC, 0xFB };
IPAddress ip(192, 168, 100, 57);
IPAddress dnsServer(192, 168, 100, 1);
IPAddress gateway(192, 168, 100, 1);
IPAddress subnet(255, 255, 255, 0);

const char *MQTT_BROKER = "broker.emqx.io";
const int MQTT_PORT = 1883;
const char *MQTT_USER = "emqx";
const char *MQTT_PASS = "public";
const char *CLIENT_ID = "gisa-mega-eth";

const char *TOPIC_CMD = "gisa/rele";
const char *TOPIC_STATUS = "rele/status";
const char *TOPIC_SENSOR = "rele/sensor";
const char *TOPIC_TRAVEL = "rele/travel";
const char *SYNC_CMD = "VA";
const char *TRAVEL_ON_CMD = "TV_ON";
const char *TRAVEL_OFF_CMD = "TV_OFF";

const int RELAY_DATA_PIN = 4;
const int RELAY_CLOCK_PIN = 5;
const int RELAY_MODULES = 6;

const int LIGHT_THRESHOLD = 150;
const int LIGHT_HYSTERESIS = 15;
const int LIGHT_THRESHOLD_ON = LIGHT_THRESHOLD + LIGHT_HYSTERESIS;
const int LIGHT_THRESHOLD_OFF = LIGHT_THRESHOLD - LIGHT_HYSTERESIS;
const unsigned long PULSE_MS = 600;
// Leitura dos sensores em baixa frequência para evitar spam no MQTT.
const unsigned long POLL_MS = 3000;
const unsigned long HEARTBEAT_MS = 30000;

SerialRelay relays(RELAY_DATA_PIN, RELAY_CLOCK_PIN, RELAY_MODULES);
EthernetClient ethernet;
PubSubClient client(ethernet);

struct Light {
  const char *cmd;
  uint8_t relay;
  uint8_t module;
  uint8_t sensorPin;
  int8_t lastSensor;
};

struct Gate {
  const char *cmd;
  uint8_t relay;
  uint8_t module;
  bool pulsing;
  unsigned long offAt;
};

struct TravelStep {
  uint8_t lightIndex;
  unsigned long durationMs;
};

struct TravelMode {
  bool enabled;
  uint8_t currentStep;
  unsigned long stepEndsAt;
};

Light lights[] = {
  { "R1", 1, 1, A1, -1 },
  { "R2", 2, 1, A2, -1 },
  { "R3", 3, 1, A3, -1 },
  { "R4", 4, 1, A4, -1 },
  { "R5", 1, 2, A5, -1 },
  { "R6", 4, 6, A8, -1 },
  { "R7", 3, 6, A9, -1 },
  { "R8", 2, 6, A10, -1 },
  { "R9", 1, 6, A11, -1 },
  { "R10", 4, 5, A12, -1 },
};

Gate gates[] = {
  { "P1", 2, 2, false, 0 },
  { "P2", 3, 2, false, 0 },
  { "P3", 4, 2, false, 0 },
};

const uint8_t LIGHT_COUNT = sizeof(lights) / sizeof(lights[0]);
const uint8_t GATE_COUNT = sizeof(gates) / sizeof(gates[0]);

TravelStep travelSteps[] = {
  { 1, 5UL * 60UL * 1000UL },
  { 4, 4UL * 60UL * 1000UL },
  { 2, 3UL * 60UL * 1000UL },
  { 3, 5UL * 60UL * 1000UL },
  { 6, 3UL * 60UL * 1000UL },
};

const uint8_t TRAVEL_STEP_COUNT = sizeof(travelSteps) / sizeof(travelSteps[0]);
TravelMode travelMode = { false, 0, 0 };

unsigned long lastPoll = 0;
unsigned long lastBeat = 0;

int freeRam() {
  extern int __heap_start, *__brkval;
  int v;
  return (int)&v - (__brkval == 0 ? (int)&__heap_start : (int)__brkval);
}

int8_t resolveLightReading(const Light &light, int raw) {
  if (light.lastSensor < 0) {
    return raw >= LIGHT_THRESHOLD ? 1 : 0;
  }

  if (light.lastSensor == 1) {
    return raw <= LIGHT_THRESHOLD_OFF ? 0 : 1;
  }

  return raw >= LIGHT_THRESHOLD_ON ? 1 : 0;
}

void publishState(const char *topic, const char *name, bool value) {
  char payload[28];
  snprintf(payload, sizeof(payload), "{'%s': '%s'}", name, value ? "true" : "false");
  bool ok = client.publish(topic, payload);
  LOG(F("[PUB] "));
  LOG(topic);
  LOG(F(" "));
  LOG(payload);
  LOG(F(" -> "));
  LOGLN(ok ? F("ok") : F("FALHOU"));
}

bool setLightState(uint8_t i, bool turnOn, bool publishRelayState) {
  Light &light = lights[i];
  bool currentOn = relays.GetState(light.relay, light.module) != 0;
  if (currentOn == turnOn) {
    return false;
  }

  relays.SetRelay(light.relay, turnOn ? SERIAL_RELAY_ON : SERIAL_RELAY_OFF, light.module);
  LOG(F("[LUZ] "));
  LOG(light.cmd);
  LOG(F(" rele="));
  LOG(light.relay);
  LOG(F(" mod="));
  LOG(light.module);
  LOG(F(" -> "));
  LOGLN(turnOn ? F("LIGAR") : F("DESLIGAR"));

  if (publishRelayState) {
    publishState(TOPIC_STATUS, light.cmd, turnOn);
  }
  return true;
}

void publishTravelStatus() {
  char payload[112];
  if (!travelMode.enabled) {
    snprintf(payload, sizeof(payload), "{'enabled':'false','current':'','next':'','remaining':'0','duration':'0','index':'0'}");
  } else {
    const TravelStep &current = travelSteps[travelMode.currentStep];
    const TravelStep &next = travelSteps[(travelMode.currentStep + 1) % TRAVEL_STEP_COUNT];
    unsigned long remainingMs = (long)(travelMode.stepEndsAt - millis()) > 0 ? travelMode.stepEndsAt - millis() : 0;
    unsigned long remainingSec = (remainingMs + 999UL) / 1000UL;
    unsigned long durationSec = current.durationMs / 1000UL;

    snprintf(
      payload,
      sizeof(payload),
      "{'enabled':'true','current':'%s','next':'%s','remaining':'%lu','duration':'%lu','index':'%u'}",
      lights[current.lightIndex].cmd,
      lights[next.lightIndex].cmd,
      remainingSec,
      durationSec,
      travelMode.currentStep
    );
  }

  bool ok = client.publish(TOPIC_TRAVEL, payload);
  LOG(F("[PUB] "));
  LOG(TOPIC_TRAVEL);
  LOG(F(" "));
  LOG(payload);
  LOG(F(" -> "));
  LOGLN(ok ? F("ok") : F("FALHOU"));
}

void stopTravelMode(bool turnOffCurrentLight) {
  if (!travelMode.enabled) {
    publishTravelStatus();
    return;
  }

  if (turnOffCurrentLight) {
    setLightState(travelSteps[travelMode.currentStep].lightIndex, false, true);
  }

  travelMode.enabled = false;
  travelMode.stepEndsAt = 0;
  publishTravelStatus();
}

void activateTravelStep(uint8_t stepIndex) {
  travelMode.enabled = true;
  travelMode.currentStep = stepIndex % TRAVEL_STEP_COUNT;
  const TravelStep &step = travelSteps[travelMode.currentStep];
  setLightState(step.lightIndex, true, true);
  travelMode.stepEndsAt = millis() + step.durationMs;
  publishTravelStatus();
}

void startTravelMode() {
  if (travelMode.enabled) {
    publishTravelStatus();
    return;
  }

  for (uint8_t i = 0; i < TRAVEL_STEP_COUNT; i++) {
    setLightState(travelSteps[i].lightIndex, false, true);
  }
  activateTravelStep(0);
}

void serviceTravelMode() {
  if (!travelMode.enabled) {
    return;
  }

  if ((long)(millis() - travelMode.stepEndsAt) < 0) {
    return;
  }

  uint8_t previousLight = travelSteps[travelMode.currentStep].lightIndex;
  uint8_t nextStepIndex = (travelMode.currentStep + 1) % TRAVEL_STEP_COUNT;
  uint8_t nextLight = travelSteps[nextStepIndex].lightIndex;

  if (previousLight != nextLight) {
    setLightState(previousLight, false, true);
  }
  activateTravelStep(nextStepIndex);
}

void toggleLight(uint8_t i) {
  Light &light = lights[i];
  bool currentOn = relays.GetState(light.relay, light.module) != 0;
  setLightState(i, !currentOn, true);
}

void pulseGate(uint8_t i) {
  Gate &gate = gates[i];
  relays.SetRelay(gate.relay, SERIAL_RELAY_ON, gate.module);
  gate.pulsing = true;
  gate.offAt = millis() + PULSE_MS;
  LOG(F("[PORTAO] "));
  LOG(gate.cmd);
  LOG(F(" pulso ON rele="));
  LOG(gate.relay);
  LOG(F(" mod="));
  LOG(gate.module);
  LOG(F(" por "));
  LOG(PULSE_MS);
  LOGLN(F("ms"));
}

void serviceGatePulses() {
  for (uint8_t i = 0; i < GATE_COUNT; i++) {
    Gate &gate = gates[i];
    if (gate.pulsing && (long)(millis() - gate.offAt) >= 0) {
      relays.SetRelay(gate.relay, SERIAL_RELAY_OFF, gate.module);
      gate.pulsing = false;
      LOG(F("[PORTAO] "));
      LOG(gate.cmd);
      LOGLN(F(" pulso OFF"));
    }
  }
}

void pollLightSensors() {
  for (uint8_t i = 0; i < LIGHT_COUNT; i++) {
    Light &light = lights[i];
    int raw = analogRead(light.sensorPin);
    int8_t reading = resolveLightReading(light, raw);
    if (reading != light.lastSensor) {
      light.lastSensor = reading;
      LOG(F("[SENSOR] "));
      LOG(light.cmd);
      LOG(F(" raw="));
      LOG(raw);
      LOG(F(" -> "));
      LOGLN(reading == 1 ? F("LIGADO") : F("DESLIGADO"));
      publishState(TOPIC_SENSOR, light.cmd, reading == 1);
    }
  }
}

void publishAll() {
  LOGLN(F("[SYNC] enviando estado de todas as luzes"));
  for (uint8_t i = 0; i < LIGHT_COUNT; i++) {
    int raw = analogRead(lights[i].sensorPin);
    int8_t reading = resolveLightReading(lights[i], raw);
    lights[i].lastSensor = reading;
    publishState(TOPIC_SENSOR, lights[i].cmd, reading == 1);
  }
  publishTravelStatus();
}

void callback(char *topic, byte *payload, unsigned int length) {
  char cmd[12];
  unsigned int n = length < sizeof(cmd) - 1 ? length : sizeof(cmd) - 1;
  for (unsigned int i = 0; i < n; i++) cmd[i] = (char)payload[i];
  cmd[n] = '\0';

  LOG(F("[CMD] topic="));
  LOG(topic);
  LOG(F(" len="));
  LOG(length);
  LOG(F(" cmd="));
  LOGLN(cmd);

  if (length == 0) {
    LOGLN(F("[CMD] vazio, ignorado"));
    return;
  }

  if (strcmp(cmd, SYNC_CMD) == 0) {
    LOGLN(F("[CMD] sincronizar (VA)"));
    publishAll();
    return;
  }
  if (strcmp(cmd, TRAVEL_ON_CMD) == 0) {
    LOGLN(F("[CMD] ativar modo viagem"));
    startTravelMode();
    return;
  }
  if (strcmp(cmd, TRAVEL_OFF_CMD) == 0) {
    LOGLN(F("[CMD] desativar modo viagem"));
    stopTravelMode(true);
    return;
  }
  for (uint8_t i = 0; i < LIGHT_COUNT; i++) {
    if (strcmp(cmd, lights[i].cmd) == 0) {
      if (travelMode.enabled) {
        bool keepCurrentLight = travelSteps[travelMode.currentStep].lightIndex == i;
        stopTravelMode(!keepCurrentLight);
      }
      toggleLight(i);
      return;
    }
  }
  for (uint8_t i = 0; i < GATE_COUNT; i++) {
    if (strcmp(cmd, gates[i].cmd) == 0) {
      pulseGate(i);
      return;
    }
  }
  LOG(F("[CMD] desconhecido: "));
  LOGLN(cmd);
}

void reconnect() {
  while (!client.connected()) {
    LOG(F("[MQTT] conectando em "));
    LOG(MQTT_BROKER);
    LOG(F(":"));
    LOGLN(MQTT_PORT);
    if (client.connect(CLIENT_ID, MQTT_USER, MQTT_PASS)) {
      LOGLN(F("[MQTT] conectado"));
      client.subscribe(TOPIC_CMD);
      LOG(F("[MQTT] inscrito em "));
      LOGLN(TOPIC_CMD);
      publishAll();
    } else {
      LOG(F("[MQTT] falhou, state="));
      LOGLN(client.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(9600);
  LOGLN(F("=== Gisa Mega MQTT iniciando ==="));

  if (Ethernet.hardwareStatus() == EthernetNoHardware) {
    LOGLN(F("[NET] AVISO: shield Ethernet nao detectado"));
  }

  if (Ethernet.begin(mac) == 0) {
    LOGLN(F("[NET] DHCP falhou, usando IP estatico"));
    Ethernet.begin(mac, ip, dnsServer, gateway, subnet);
  } else {
    LOGLN(F("[NET] DHCP ok"));
  }

  if (Ethernet.linkStatus() == LinkOFF) {
    LOGLN(F("[NET] AVISO: cabo de rede desconectado"));
  }

  LOG(F("[NET] IP: "));
  LOGLN(Ethernet.localIP());

  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(callback);

  LOG(F("[BOOT] luzes="));
  LOG(LIGHT_COUNT);
  LOG(F(" portoes="));
  LOG(GATE_COUNT);
  LOG(F(" freeRam="));
  LOGLN(freeRam());
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  serviceGatePulses();
  serviceTravelMode();

  if (millis() - lastPoll >= POLL_MS) {
    lastPoll = millis();
    pollLightSensors();
  }

  if (millis() - lastBeat >= HEARTBEAT_MS) {
    lastBeat = millis();
    LOG(F("[HB] ativo ip="));
    LOG(Ethernet.localIP());
    LOG(F(" mqtt="));
    LOG(client.connected() ? F("on") : F("off"));
    LOG(F(" freeRam="));
    LOGLN(freeRam());
  }
}
