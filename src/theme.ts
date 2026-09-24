import { color, gradient } from 'grfti';

const theme = {
  sha: color('#4aa3df'),
  message: color('#79cbca'),
  date: color('#c779d0'),
  name: color('#ffd166'),
  email: color('#59d499'),
  field: color('#b0c4de'),
  muted: color('#8a8a8a'),
  strong: color('#ffffff'),
  success: color('#59d499'),
  warning: color('#ffb000'),
  error: color('#ff6363'),
  before: color('#ff8a80'),
  after: color('#59d499'),
} as const;

type Paint = (text: string) => string;

const highlight: Paint = (text) => color('#ffd166').bg(color('#000000')(text));

const LOGO = [
  '             _',
  ' ___ ___ ___| |_ ___ ___ _ _',
  '|  _| -_|_ -|  _| . |  _| | |',
  '|_| |___|___|_| |___|_| |_  |',
  '                        |___|',
].join('\n');

const logo = (space = ' '): string =>
  gradient('#f7681f', '#eb0f84', '#a603d5', '#03aad2')
    .diagonal(LOGO.replace(/ /g, space))
    .split('\n')
    .map((line) => `${space.repeat(2)}${line}`)
    .join('\n');

export { theme, highlight, logo, Paint };
