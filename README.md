# Gisa Home (React + MQTT)

App mobile-first para automação residencial via MQTT.

## Rodar localmente

```bash
cp .env.example .env
npm install
npm run dev
```

## Validar build

```bash
npm run lint
npm run build
```

## Fluxo MQTT (compatível com projeto Vue)

- Broker: `wss://broker.emqx.io:8084/mqtt`
- Publish topic: `gisa/rele`
- Subscribe topics: `rele/status`, `rele/sensor`, `rele/door`
- Comandos: `VA`, `R1..R10`, `P1..P3`
