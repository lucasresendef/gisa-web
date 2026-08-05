#define DEBUG 1

#include <SPI.h>
#include <Ethernet.h>
#include <PubSubClient.h>
#include <SerialRelay.h>

#if DEBUG
#define LOG(x) Serial.print(x)
#define LOGLN(x) Serial.println(x)
#else
#define LOG(x)
#define LOGLN(x)
#endif

byte mac[] = { 0x70, 0xB3, 0xD5, 0x0A, 0xCC, 0xFB };
IPAddress staticIp(192, 168, 24, 57);
IPAddress dnsServer(192, 168, 24, 1);
IPAddress gateway(192, 168, 24, 1);
IPAddress subnet(255, 255, 255, 0);

const bool PREFER_DHCP = true;
const unsigned long DHCP_TIMEOUT_MS = 6000;
const unsigned long DHCP_RESPONSE_TIMEOUT_MS = 2000;
const unsigned long DHCP_RETRY_MS = 300000UL;
const unsigned long LINK_CHECK_MS = 1000;
const unsigned long NET_RETRY_MIN_MS = 3000;
const unsigned long NET_RETRY_MAX_MS = 60000UL;
const unsigned long MQTT_RETRY_MIN_MS = 2000;
const unsigned long MQTT_RETRY_MAX_MS = 60000UL;
const uint8_t MQTT_FAILS_BEFORE_NET_RESET = 5;
const uint16_t MQTT_SOCKET_TIMEOUT_S = 4;
const uint16_t MQTT_KEEPALIVE_S = 20;
const uint16_t ETH_RETRANSMISSION_MS = 200;
const uint8_t ETH_RETRANSMISSION_COUNT = 3;

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

bool netConfigured = false;
bool usingStaticIp = false;
bool linkUp = true;
bool hardwareMissing = false;
bool ethernetStarted = false;
bool clearMqttPacingOnUp = true;
unsigned long lastLinkCheck = 0;
unsigned long netNextAttemptAt = 0;
unsigned long netBackoffMs = NET_RETRY_MIN_MS;
unsigned long dhcpRetryAt = 0;
unsigned long mqttNextAttemptAt = 0;
unsigned long mqttBackoffMs = MQTT_RETRY_MIN_MS;
uint8_t mqttFailStreak = 0;
uint16_t netResetCount = 0;
uint16_t mqttConnectCount = 0;

int freeRam() {
  extern int __heap_start, *__brkval;
  int v;
  return (int)&v - (__brkval == 0 ? (int)&__heap_start : (int)__brkval);
}

unsigned long growBackoff(unsigned long current, unsigned long limit) {
  unsigned long next = current * 2;
  return next > limit ? limit : next;
}

bool sameSubnet(const IPAddress &a, const IPAddress &b, const IPAddress &mask) {
  for (uint8_t i = 0; i < 4; i++) {
    if ((a[i] & mask[i]) != (b[i] & mask[i])) {
      return false;
    }
  }
  return true;
}

bool hasUsableIp() {
  IPAddress current = Ethernet.localIP();
  if (current[0] == 0) {
    return false;
  }
  if (current[0] == 169 && current[1] == 254) {
    return false;
  }
  return true;
}

bool anyGatePulsing() {
  for (uint8_t i = 0; i < GATE_COUNT; i++) {
    if (gates[i].pulsing) {
      return true;
    }
  }
  return false;
}

void validateStaticConfig() {
  LOG(F("[NET] plano estatico ip="));
  LOG(staticIp);
  LOG(F(" gw="));
  LOG(gateway);
  LOG(F(" mask="));
  LOG(subnet);
  LOG(F(" dns="));
  LOGLN(dnsServer);

  if (!sameSubnet(staticIp, gateway, subnet)) {
    LOGLN(F("[NET] ERRO: ip estatico fora da sub-rede do gateway"));
  }
  if (staticIp == gateway) {
    LOGLN(F("[NET] ERRO: ip estatico igual ao gateway"));
  }
  if (staticIp[3] == 0 || staticIp[3] == 255) {
    LOGLN(F("[NET] ERRO: ip estatico usa endereco de rede ou broadcast"));
  }
}

void reportAddress() {
  IPAddress current = Ethernet.localIP();
  LOG(F("[NET] ip="));
  LOG(current);
  LOG(F(" gw="));
  LOG(Ethernet.gatewayIP());
  LOG(F(" dns="));
  LOG(Ethernet.dnsServerIP());
  LOG(F(" modo="));
  LOGLN(usingStaticIp ? F("estatico") : F("dhcp"));

  if (!sameSubnet(current, gateway, subnet)) {
    LOGLN(F("[NET] AVISO: ip obtido fora da sub-rede esperada"));
  }
}

void dropMqtt() {
  if (client.connected()) {
    client.disconnect();
  }
  ethernet.stop();
}

void applyStaticIp() {
  Ethernet.begin(mac, staticIp, dnsServer, gateway, subnet);
  usingStaticIp = true;
  dhcpRetryAt = millis() + DHCP_RETRY_MS;
}

bool bringNetworkUp() {
  dropMqtt();

  bool gotLease = false;
  if (PREFER_DHCP) {
    LOGLN(F("[NET] solicitando DHCP"));
    gotLease = Ethernet.begin(mac, DHCP_TIMEOUT_MS, DHCP_RESPONSE_TIMEOUT_MS) != 0;
  }

  if (gotLease) {
    usingStaticIp = false;
    LOGLN(F("[NET] DHCP ok"));
  } else {
    if (PREFER_DHCP) {
      LOGLN(F("[NET] DHCP indisponivel, aplicando ip estatico"));
    }
    applyStaticIp();
  }

  if (Ethernet.hardwareStatus() == EthernetNoHardware) {
    if (!hardwareMissing) {
      hardwareMissing = true;
      LOGLN(F("[NET] shield Ethernet nao detectado"));
    }
    return false;
  }

  if (hardwareMissing) {
    hardwareMissing = false;
    LOGLN(F("[NET] shield Ethernet detectado"));
  }

  ethernetStarted = true;
  Ethernet.setRetransmissionTimeout(ETH_RETRANSMISSION_MS);
  Ethernet.setRetransmissionCount(ETH_RETRANSMISSION_COUNT);

  if (!hasUsableIp()) {
    LOGLN(F("[NET] endereco invalido apos configuracao"));
    return false;
  }

  reportAddress();
  return true;
}

void requestNetworkRestart(bool resetMqttPacing) {
  netConfigured = false;
  netNextAttemptAt = millis();
  netBackoffMs = NET_RETRY_MIN_MS;
  clearMqttPacingOnUp = resetMqttPacing;
}

void serviceDhcpLease() {
  if (usingStaticIp) {
    if ((long)(millis() - dhcpRetryAt) >= 0) {
      dhcpRetryAt = millis() + DHCP_RETRY_MS;
      if (!client.connected()) {
        LOGLN(F("[NET] tentando recuperar DHCP"));
        requestNetworkRestart(false);
      }
    }
    return;
  }

  int result = Ethernet.maintain();
  if (result == 1 || result == 3) {
    LOG(F("[NET] lease DHCP perdido, codigo="));
    LOGLN(result);
    dropMqtt();
    requestNetworkRestart(true);
  } else if (result == 2 || result == 4) {
    LOG(F("[NET] lease DHCP renovado, codigo="));
    LOGLN(result);
    reportAddress();
  }
}

void serviceNetwork() {
  if (ethernetStarted && millis() - lastLinkCheck >= LINK_CHECK_MS) {
    lastLinkCheck = millis();
    bool nowUp = Ethernet.linkStatus() != LinkOFF;
    if (nowUp != linkUp) {
      linkUp = nowUp;
      if (linkUp) {
        LOGLN(F("[NET] cabo conectado"));
        requestNetworkRestart(true);
      } else {
        LOGLN(F("[NET] cabo desconectado"));
        netConfigured = false;
        dropMqtt();
      }
    }
  }

  if (!linkUp) {
    return;
  }

  if (netConfigured) {
    serviceDhcpLease();
    return;
  }

  if ((long)(millis() - netNextAttemptAt) < 0) {
    return;
  }
  if (anyGatePulsing()) {
    return;
  }

  if (bringNetworkUp()) {
    netConfigured = true;
    netBackoffMs = NET_RETRY_MIN_MS;
    if (clearMqttPacingOnUp) {
      mqttBackoffMs = MQTT_RETRY_MIN_MS;
      mqttFailStreak = 0;
      mqttNextAttemptAt = millis();
    } else {
      mqttNextAttemptAt = millis() + mqttBackoffMs;
    }
  } else {
    netNextAttemptAt = millis() + netBackoffMs;
    LOG(F("[NET] nova tentativa em "));
    LOG(netBackoffMs / 1000);
    LOGLN(F("s"));
    netBackoffMs = growBackoff(netBackoffMs, NET_RETRY_MAX_MS);
  }
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
  if (!client.connected()) {
    return;
  }

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
  if (!client.connected()) {
    return;
  }

  char payload[112];
  if (!travelMode.enabled) {
    snprintf(payload, sizeof(payload), "{'enabled':'false','current':'','next':'','remaining':'0','duration':'0','index':'0'}");
  } else {
    const TravelStep &current = travelSteps[travelMode.currentStep];
    const TravelStep &next = travelSteps[(travelMode.currentStep + 1) % TRAVEL_STEP_COUNT];
    long remainingSigned = (long)(travelMode.stepEndsAt - millis());
    unsigned long remainingMs = remainingSigned > 0 ? (unsigned long)remainingSigned : 0;
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

void serviceMqtt() {
  if (client.connected()) {
    client.loop();
    return;
  }

  if (!netConfigured || !linkUp) {
    return;
  }
  if ((long)(millis() - mqttNextAttemptAt) < 0) {
    return;
  }
  if (anyGatePulsing()) {
    return;
  }

  LOG(F("[MQTT] conectando em "));
  LOG(MQTT_BROKER);
  LOG(F(":"));
  LOGLN(MQTT_PORT);

  if (client.connect(CLIENT_ID, MQTT_USER, MQTT_PASS)) {
    mqttFailStreak = 0;
    mqttBackoffMs = MQTT_RETRY_MIN_MS;
    mqttConnectCount++;
    LOGLN(F("[MQTT] conectado"));
    client.subscribe(TOPIC_CMD);
    LOG(F("[MQTT] inscrito em "));
    LOGLN(TOPIC_CMD);
    publishAll();
    return;
  }

  mqttFailStreak++;
  LOG(F("[MQTT] falhou, state="));
  LOG(client.state());
  LOG(F(" tentativa="));
  LOG(mqttFailStreak);
  LOG(F(" proxima em "));
  LOG(mqttBackoffMs / 1000);
  LOGLN(F("s"));

  mqttNextAttemptAt = millis() + mqttBackoffMs;
  mqttBackoffMs = growBackoff(mqttBackoffMs, MQTT_RETRY_MAX_MS);

  if (mqttFailStreak >= MQTT_FAILS_BEFORE_NET_RESET) {
    mqttFailStreak = 0;
    netResetCount++;
    LOGLN(F("[NET] falhas seguidas no MQTT, reinicializando a rede"));
    dropMqtt();
    requestNetworkRestart(false);
  }
}

void setup() {
  Serial.begin(9600);
  LOGLN(F("=== Gisa Mega MQTT iniciando ==="));

  delay(250);

  validateStaticConfig();

  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(callback);
  client.setKeepAlive(MQTT_KEEPALIVE_S);
  client.setSocketTimeout(MQTT_SOCKET_TIMEOUT_S);

  linkUp = true;
  ethernetStarted = false;
  netConfigured = false;
  netNextAttemptAt = millis();
  netBackoffMs = NET_RETRY_MIN_MS;
  mqttNextAttemptAt = millis();
  mqttBackoffMs = MQTT_RETRY_MIN_MS;
  clearMqttPacingOnUp = true;

  LOG(F("[BOOT] luzes="));
  LOG(LIGHT_COUNT);
  LOG(F(" portoes="));
  LOG(GATE_COUNT);
  LOG(F(" freeRam="));
  LOGLN(freeRam());
}

void loop() {
  serviceGatePulses();
  serviceNetwork();
  serviceMqtt();
  serviceGatePulses();
  serviceTravelMode();

  if (millis() - lastPoll >= POLL_MS) {
    lastPoll = millis();
    pollLightSensors();
  }

  if (millis() - lastBeat >= HEARTBEAT_MS) {
    lastBeat = millis();
    LOG(F("[HB] up="));
    LOG(millis() / 1000);
    LOG(F("s cabo="));
    LOG(linkUp ? F("on") : F("off"));
    LOG(F(" ip="));
    LOG(Ethernet.localIP());
    LOG(F(" modo="));
    LOG(usingStaticIp ? F("estatico") : F("dhcp"));
    LOG(F(" mqtt="));
    LOG(client.connected() ? F("on") : F("off"));
    LOG(F(" conexoes="));
    LOG(mqttConnectCount);
    LOG(F(" resets="));
    LOG(netResetCount);
    LOG(F(" freeRam="));
    LOGLN(freeRam());
  }
}
