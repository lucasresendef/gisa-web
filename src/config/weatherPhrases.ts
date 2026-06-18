export type WeatherCondition = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

export type WeatherIconName =
  | 'sun'
  | 'moon'
  | 'cloud-sun'
  | 'cloud-moon'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder';

export const codeToCondition = (code: number): WeatherCondition => {
  if (code === 0) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 57) || code === 56 || code === 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'cloudy';
};

export const conditionLabel = (condition: WeatherCondition, isDay: boolean): string => {
  switch (condition) {
    case 'clear':
      return isDay ? 'Ensolarado' : 'Céu limpo';
    case 'cloudy':
      return 'Nublado';
    case 'fog':
      return 'Neblina';
    case 'drizzle':
      return 'Garoa';
    case 'rain':
      return 'Chuva';
    case 'snow':
      return 'Neve';
    case 'thunder':
      return 'Tempestade';
  }
};

export const conditionIcon = (condition: WeatherCondition, isDay: boolean): WeatherIconName => {
  switch (condition) {
    case 'clear':
      return isDay ? 'sun' : 'moon';
    case 'cloudy':
      return isDay ? 'cloud-sun' : 'cloud-moon';
    case 'fog':
      return 'fog';
    case 'drizzle':
      return 'drizzle';
    case 'rain':
      return 'rain';
    case 'snow':
      return 'snow';
    case 'thunder':
      return 'thunder';
  }
};

type PhraseSet = { day: string[]; night?: string[] };

const phrases: Record<WeatherCondition, PhraseSet> = {
  clear: {
    day: [
      'Dia ensolarado lá fora, um ótimo dia pra abrir as cortinas e deixar a luz entrar. ☀️',
      'Sol brilhando! Que tal aproveitar essa energia boa hoje? 🌞',
      'Céu limpo e clima leve, perfeito pra fazer aquilo que você vinha adiando. ✨',
      'Que sol gostoso! Aproveite pra arejar a casa e tomar um solzinho. 🌅',
      'Dia lindo lá fora, daqueles que dão vontade de sair pra caminhar. 😎',
      'Tempo aberto e quentinho, ótimo pra colocar a roupa no varal. 👕',
    ],
    night: [
      'Noite limpa e estrelada, hora de desacelerar e relaxar em casa. 🌙',
      'Céu aberto lá fora, uma luz aconchegante combina com essa noite calma. ✨',
      'Que noite tranquila! As estrelas estão de fora, perfeito pra respirar fundo. 🌌',
      'Céu sem nuvens essa noite, clima ideal pra uma luz baixinha e sossego. 🌙',
    ],
  },
  cloudy: {
    day: [
      'Tempo nublado hoje, uma luz acesa deixa a casa mais aconchegante. ☁️',
      'Dia de céu fechado, daqueles tranquilos pra um café e boa companhia. ☕',
      'Céu cinzento lá fora, ótimo pra um dia mais lento e gostoso. 🌥️',
      'Nuvens cobrindo o sol, que tal deixar a casa bem iluminada? 💡',
      'Dia abafado e nublado, melhor manter tudo arejado e leve. 🌫️',
    ],
    night: [
      'Noite nublada e quietinha, clima perfeito pra um cobertor e luz baixinha. ☁️🌙',
      'Céu fechado essa noite, hora de aconchego e uma luz suave. 🌙',
    ],
  },
  fog: {
    day: [
      'Neblina por aí, vá com calma e mantenha tudo bem iluminado. 🌫️',
      'Dia enevoado, meio de filme, que tal acender as luzes e relaxar? 🌫️',
      'Bruma cobrindo tudo lá fora, em casa é luz acesa e aconchego. 🌫️',
      'Visibilidade baixa por causa da neblina, capriche na iluminação. 💡',
    ],
    night: [
      'Neblina à noite, mantenha o caminho bem iluminado e fique tranquilo. 🌫️🌙',
      'Névoa cobrindo a noite, deixe uma luz acesa pra dar segurança. 🌙',
    ],
  },
  drizzle: {
    day: [
      'Garoa fininha caindo, clima gostoso pra ficar em casa. 🌦️',
      'Chuvinha leve lá fora, ótima desculpa pra um chá quentinho. 🍵',
      'Aquela garoa de molhar devagar, perfeita pra um dia preguiçoso. 🌧️',
      'Chuvisco leve no ar, que tal uma luz aconchegante e um bom livro? 📖',
    ],
    night: [
      'Garoa caindo à noite, clima perfeito pra relaxar com uma luz baixinha. 🌧️🌙',
      'Chuvinha fina lá fora, hora de aconchego e sossego em casa. 🌙',
    ],
  },
  rain: {
    day: [
      'Dia chuvoso, perfeito pra um chocolate quente e uma luz baixinha. 🌧️☕',
      'Chuva caindo lá fora, e isso pede aconchego: cobertor e filme. ☔',
      'Dia de chuva, dia de ficar em casa com tudo bem iluminado e quentinho. 🌧️',
      'Som de chuva lá fora, um convite pra desacelerar e curtir o conforto de casa. ☔',
      'Chuva forte por aí, confira as janelas e fique bem aconchegado. 🌧️',
    ],
    night: [
      'Chuva à noite, clima perfeito pra dormir ouvindo o barulhinho da água. 🌧️😴',
      'Chuva caindo na madrugada, hora de aconchego total e luz bem suave. 🌧️🌙',
    ],
  },
  snow: {
    day: [
      'Friozinho de neve por aí, hora de um cobertor e uma luz bem quente. ❄️',
      'Neve lá fora, em casa é calor, cobertor e luz aconchegante. ☃️',
      'Branquinho lá fora, dia perfeito pra ficar quentinho dentro de casa. ❄️',
    ],
    night: [
      'Noite gelada de neve, capriche no aconchego e numa luz quentinha. ❄️🌙',
      'Neve caindo na noite, nada melhor que um cobertor e luz suave. ☃️🌙',
    ],
  },
  thunder: {
    day: [
      'Tempestade chegando, confira os portões e fique aquecido em casa. ⛈️',
      'Dia de trovoada lá fora; em casa, tudo seguro e iluminado. ⚡',
      'Raios e trovões a caminho, melhor recolher tudo e ficar seguro em casa. ⛈️',
      'Céu carregado e tempestade no ar, mantenha tudo fechado e protegido. 🌩️',
    ],
    night: [
      'Tempestade à noite, feche os portões, fique seguro e bem iluminado. ⛈️🌙',
      'Trovoada na madrugada, hora de aconchego e segurança em casa. 🌩️🌙',
    ],
  },
};

export const pickWeatherPhrase = (condition: WeatherCondition, isDay: boolean): string => {
  const set = phrases[condition];
  const pool = (!isDay && set.night?.length ? set.night : set.day) ?? set.day;
  return pool[Math.floor(Math.random() * pool.length)];
};
