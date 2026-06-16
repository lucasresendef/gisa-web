# 🔌 Simulador do Arduino Mega (mock MQTT)

Simula o hardware da casa para você testar **toda a parte visual** do Gisa Home
sem precisar do Arduino real. Ele conecta no mesmo broker MQTT do app, escuta os
comandos que a interface publica e devolve os status — assim as luzes e portões
reagem na tela de verdade.

## Como usar

Em **dois terminais** separados, na raiz do projeto:

```bash
# Terminal 1 — a interface
npm run dev

# Terminal 2 — o "Arduino" simulado
npm run mock
```

Abra o app no navegador e use normalmente:

- Toque numa **luz** → o simulador alterna o relé e a interface mostra "Ligado".
- Toque num **portão**, digite a senha `1134` → o simulador abre o portão
  (`Aberto`) e o "fecha" sozinho depois de 6 s (`Fechado`), como um portão real.
- Ao abrir/atualizar o app, ele envia `VA` (sincronizar) e o simulador responde
  com o estado completo — por isso os cards saem de "carregando".

### Modo demo (muda sozinho)

Para ver a interface animando sem tocar em nada (ótimo para gravar/printar):

```bash
npm run mock:demo
```

Ele continua respondendo aos seus comandos **e** liga/desliga um dispositivo
aleatório a cada poucos segundos.

## Ajustes opcionais

Variáveis de ambiente aceitas pelo script:

| Variável             | Padrão                        | O que faz                                   |
| -------------------- | ----------------------------- | ------------------------------------------- |
| `SIM_MQTT_URL`       | mesma URL do app (`.env`)     | Força outra URL/transport (ex.: TCP 1883)   |
| `SIM_GATE_CLOSE`     | `6000`                        | Tempo (ms) até o portão fechar sozinho      |
| `SIM_DEMO_INTERVAL`  | `4000`                        | Intervalo (ms) entre mudanças no modo demo  |

Exemplo usando TCP em vez de WebSocket:

```bash
SIM_MQTT_URL=mqtt://broker.emqx.io:1883 npm run mock
```

## Como funciona (protocolo)

Lê o broker e os tópicos do `.env` do projeto (`VITE_MQTT_*`). Por padrão:

| Direção            | Tópico        | Conteúdo                                      |
| ------------------ | ------------- | --------------------------------------------- |
| App → simulador    | `gisa/rele`   | Comando em texto: `R5`, `P1`, `VA`, …         |
| Simulador → app    | `rele/status` | Relés: `{"R5": true}` (`true`=ligado)         |
| Simulador → app    | `rele/door`   | Portões: `{"P1": true}` (`true`=aberto)       |

O formato do payload é o que o app espera em
[`src/utils/mqttParser.ts`](../../src/utils/mqttParser.ts). A lista de
dispositivos espelha [`src/config/homeConfig.ts`](../../src/config/homeConfig.ts)
— se você adicionar/renomear relés ou portões lá, atualize as listas `RELAYS` e
`GATES` no topo de `simulator.mjs`.

## Os erros `ws://localhost:5174` no console são do MQTT?

**Não.** Aqueles erros (`[vite] server connection lost` / `WebSocket connection
to 'ws://localhost:5174' failed`) são do _hot-reload do Vite_ e só aparecem
quando o `npm run dev` não está rodando. Rode `npm run dev` e atualize a página
que eles somem. O MQTT usa o broker remoto (`broker.emqx.io`), não o localhost.
