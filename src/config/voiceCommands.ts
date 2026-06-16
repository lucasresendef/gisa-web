export type VoiceAction = 'on' | 'off' | 'open' | 'toggle';

export interface VoiceIntent {
  action: VoiceAction;
  target: 'device' | 'all';
  deviceId?: string;
}

export interface VoiceFeedback {
  status: 'success' | 'error' | 'gate' | 'info';
  message: string;
}

interface AliasEntry {
  deviceId: string;
  aliases: string[];
}

const deviceAliases: AliasEntry[] = [
  { deviceId: 'R5', aliases: ['sala', 'luz da sala', 'luzes da sala'] },
  {
    deviceId: 'R9',
    aliases: ['luminaria da sara', 'luminaria sara', 'luminaria', 'abajur da sara', 'abajur'],
  },
  { deviceId: 'R8', aliases: ['cozinha', 'luz da cozinha'] },
  { deviceId: 'R7', aliases: ['corredor da cozinha', 'corredor cozinha'] },
  {
    deviceId: 'R6',
    aliases: [
      'anicezio e gislaine',
      'anicezio',
      'gislaine',
      'quarto do casal',
      'quarto dos pais',
      'casal',
    ],
  },
  { deviceId: 'R1', aliases: ['quarto do noah', 'quarto noah', 'luz do noah', 'noah', 'noa'] },
  { deviceId: 'R4', aliases: ['quarto da sara', 'quarto sara', 'luz da sara', 'sara'] },
  {
    deviceId: 'R10',
    aliases: ['quarto do queven', 'quarto queven', 'luz do queven', 'queven', 'keven', 'kevin'],
  },
  {
    deviceId: 'R3',
    aliases: ['corredor dos quartos', 'corredor quartos', 'corredor dos dormitorios'],
  },
  { deviceId: 'R2', aliases: ['garagem', 'luz da garagem'] },
  { deviceId: 'P1', aliases: ['portao 1', 'portao um', 'primeiro portao'] },
  { deviceId: 'P2', aliases: ['portao 2', 'portao dois', 'segundo portao'] },
  {
    deviceId: 'P3',
    aliases: ['portao do meio', 'portao central', 'portao 3', 'portao tres', 'terceiro portao'],
  },
];

export const exampleCommands = [
  'Ligar a luz da Sara',
  'Apagar a luz do Noah',
  'Abrir o portão 1',
  'Desligar tudo',
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const targets = deviceAliases.map((entry) => ({
  deviceId: entry.deviceId,
  aliases: entry.aliases.map(normalize).sort((a, b) => b.length - a.length),
}));

const ON_WORDS = ['ligar', 'ligue', 'liga', 'acender', 'acende', 'acenda', 'ativar', 'ativa'];
const OFF_WORDS = ['desligar', 'desligue', 'desliga', 'apagar', 'apague', 'apaga', 'desativar'];
const OPEN_WORDS = ['abrir', 'abra', 'abre', 'acionar', 'aciona', 'acione', 'destrancar'];

const hasWord = (text: string, words: string[]) =>
  words.some((word) => new RegExp(`(^|\\s)${word}(\\s|$)`).test(text));

const detectAction = (text: string): VoiceAction => {
  if (hasWord(text, OPEN_WORDS)) return 'open';
  if (hasWord(text, OFF_WORDS)) return 'off';
  if (hasWord(text, ON_WORDS)) return 'on';
  return 'toggle';
};

export const parseVoiceCommand = (raw: string): VoiceIntent | null => {
  const text = normalize(raw);
  if (!text) return null;

  const action = detectAction(text);

  if (/(^|\s)(tudo|todas|todos|geral)(\s|$)/.test(text)) {
    return { action, target: 'all' };
  }

  let deviceId: string | undefined;
  let bestLength = 0;
  for (const candidate of targets) {
    for (const alias of candidate.aliases) {
      if (alias && text.includes(alias) && alias.length > bestLength) {
        bestLength = alias.length;
        deviceId = candidate.deviceId;
      }
    }
  }

  if (!deviceId) return null;
  return { action, target: 'device', deviceId };
};

interface SmallTalk {
  match: (text: string) => boolean;
  replies: string[];
}

const smallTalk: SmallTalk[] = [
  {
    match: (t) => hasWord(t, ['obrigado', 'obrigada', 'valeu', 'brigado', 'brigada', 'agradecido']),
    replies: ['De nada! Estou sempre por aqui. 💙', 'Imagina! Precisando, é só me chamar.'],
  },
  {
    match: (t) => hasWord(t, ['tchau', 'adeus', 'falou']) || /(^|\s)ate (logo|mais|breve|depois)(\s|$)/.test(t),
    replies: ['Até logo! Quando precisar, é só me chamar.', 'Tchau! Fico por aqui se precisar.'],
  },
  {
    match: (t) => /(^|\s)(o que voce faz|o que voce pode fazer|me ajuda|ajuda|quais comandos|como funciona)(\s|$)/.test(t),
    replies: [
      'Posso acender e apagar as luzes de cada cômodo e abrir os portões com senha. Tente: "Ligar a luz da Sara".',
    ],
  },
  {
    match: (t) => /(^|\s)(quem e voce|seu nome|qual e o seu nome|qual seu nome)(\s|$)/.test(t),
    replies: ['Eu sou a Gisa, sua assistente aqui de casa. 😊'],
  },
  {
    match: (t) => /(^|\s)(tudo bem|tudo bom|como vai|como voce esta|como esta|beleza)(\s|$)/.test(t),
    replies: ['Tô ótima, prontinha pra te ajudar! O que você precisa?', 'Tudo bem por aqui! E você, precisa de quê?'],
  },
  {
    match: (t) =>
      hasWord(t, ['oi', 'ola', 'opa', 'alo', 'eai']) ||
      /(^|\s)(bom dia|boa tarde|boa noite|e ai)(\s|$)/.test(t),
    replies: [
      'Oi! Eu sou a Gisa. Posso acender luzes e abrir portões pra você — é só pedir.',
      'Olá! Como posso te ajudar hoje?',
    ],
  },
];

export const matchSmallTalk = (raw: string): string | null => {
  const text = normalize(raw);
  if (!text) return null;
  for (const entry of smallTalk) {
    if (entry.match(text)) {
      return entry.replies[Math.floor(Math.random() * entry.replies.length)];
    }
  }
  return null;
};
