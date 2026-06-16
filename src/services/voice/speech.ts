export const speechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

const FEMALE_NAMES =
  /(luciana|maria|francisca|fernanda|helena|let[ií]cia|joana|camila|vit[óo]ria|adriana|female|mulher|feminin|google portugu[êe]s do brasil)/i;
const MALE_NAMES = /(felipe|daniel|ant[ôo]nio|ricardo|jo[ãa]o|jorge|male|masculin)/i;

const isFemale = (voice: SpeechSynthesisVoice) =>
  FEMALE_NAMES.test(voice.name) && !MALE_NAMES.test(voice.name);
const isPtBr = (voice: SpeechSynthesisVoice) => /pt[-_]?br/i.test(voice.lang);
const isPt = (voice: SpeechSynthesisVoice) => /^pt/i.test(voice.lang);
const isGoogle = (voice: SpeechSynthesisVoice) => /google/i.test(voice.name);

let voices: SpeechSynthesisVoice[] = [];

const loadVoices = () => {
  if (speechSupported()) voices = window.speechSynthesis.getVoices();
};

if (speechSupported()) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

const pickVoice = (): SpeechSynthesisVoice | null => {
  if (!voices.length) loadVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => isPtBr(v) && isFemale(v) && isGoogle(v)) ??
    voices.find((v) => isPtBr(v) && isFemale(v)) ??
    voices.find((v) => isPt(v) && isFemale(v)) ??
    voices.find((v) => isPtBr(v)) ??
    voices.find((v) => isPt(v)) ??
    voices.find((v) => isFemale(v)) ??
    voices[0]
  );
};

export const speak = (text: string) => {
  if (!speechSupported() || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 1;
  utterance.pitch = 1.05;
  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
    if (voice.lang) utterance.lang = voice.lang;
  }
  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
  if (speechSupported()) window.speechSynthesis.cancel();
};
