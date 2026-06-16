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
IPAddress ip(192, 168, 100, 78);
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
const char *SYNC_CMD = "VA";

const int RELAY_DATA_PIN = 4;
const int RELAY_CLOCK_PIN = 5;
const int RELAY_MODULES = 6;

const int LIGHT_THRESHOLD = 150;
const unsigned long PULSE_MS = 600;
const unsigned long POLL_MS = 120;
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

unsigned long lastPoll = 0;
unsigned long lastBeat = 0;

int freeRam() {
  extern int __heap_start, *__brkval;
  int v;
  return (int)&v - (__brkval == 0 ? (int)&__heap_start : (int)__brkval);
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

void toggleLight(uint8_t i) {
  Light &light = lights[i];
  byte current = relays.GetState(light.relay, light.module);
  bool turnOn = current == 0;
  relays.SetRelay(light.relay, turnOn ? SERIAL_RELAY_ON : SERIAL_RELAY_OFF, light.module);
  LOG(F("[LUZ] "));
  LOG(light.cmd);
  LOG(F(" rele="));
  LOG(light.relay);
  LOG(F(" mod="));
  LOG(light.module);
  LOG(F(" estadoAnterior="));
  LOG(current);
  LOG(F(" -> "));
  LOGLN(turnOn ? F("LIGAR") : F("DESLIGAR"));
  publishState(TOPIC_STATUS, light.cmd, turnOn);
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
    int8_t reading = raw < LIGHT_THRESHOLD ? 0 : 1;
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
    bool on = analogRead(lights[i].sensorPin) >= LIGHT_THRESHOLD;
    lights[i].lastSensor = on ? 1 : 0;
    publishState(TOPIC_SENSOR, lights[i].cmd, on);
  }
}

void callback(char *topic, byte *payload, unsigned int length) {
  char cmd[8];
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
  for (uint8_t i = 0; i < LIGHT_COUNT; i++) {
    if (strcmp(cmd, lights[i].cmd) == 0) {
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
