import { theme } from './theme';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const INTERVAL = 80;

const frameAt = (started: number): string => FRAMES[Math.floor((Date.now() - started) / INTERVAL) % FRAMES.length];

const spin = (text: string, stream: NodeJS.WriteStream = process.stderr): (() => void) => {
  if (!stream.isTTY) return () => undefined;
  const started = Date.now();
  const draw = (): void => void stream.write(`\r\x1b[?25l  ${theme.sha(frameAt(started))} ${text}`);
  const timer = setInterval(draw, INTERVAL);
  draw();
  return () => {
    clearInterval(timer);
    stream.write('\r\x1b[2K\x1b[?25h');
  };
};

export { spin };
