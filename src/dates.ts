import { fail } from './fail';

interface Timestamp {
  readonly epoch: number;
  readonly offset: number;
}

const OFFSET_SUFFIX = /(?:Z|([+-])(\d{2}):?(\d{2}))$/i;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const EPOCH = /^@(\d+)$/;
const DURATION_PART = /(\d+)\s*(w|d|h|m|s)/gi;
const UNIT_SECONDS: Readonly<Record<string, number>> = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };

const pad = (value: number): string => String(value).padStart(2, '0');

const explicitOffset = (input: string): number | undefined => {
  const match = input.trim().match(OFFSET_SUFFIX);
  return match ? (match[1] === '-' ? -1 : 1) * (Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)) : undefined;
};

// JS parses a bare YYYY-MM-DD as UTC but every other offset-less form as local time.
const toLocalForm = (input: string): string => (DATE_ONLY.test(input) ? `${input}T00:00:00` : input);

const toMillis = (input: string): number =>
  input === 'now' ? Date.now() : EPOCH.test(input) ? Number(input.slice(1)) * 1000 : Date.parse(toLocalForm(input));

const parseDate = (input: string): Timestamp => {
  const trimmed = input.trim();
  const millis = toMillis(trimmed);
  return Number.isNaN(millis)
    ? fail(`invalid date "${input}"`)
    : {
        epoch: Math.floor(millis / 1000),
        offset: explicitOffset(trimmed) ?? -new Date(millis).getTimezoneOffset(),
      };
};

const formatOffset = (offset: number, separator: string): string =>
  `${offset < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(offset) / 60))}${separator}${pad(Math.abs(offset) % 60)}`;

const formatDate = ({ epoch, offset }: Timestamp): string =>
  `${new Date((epoch + offset * 60) * 1000).toISOString().slice(0, 19)}${formatOffset(offset, ':')}`;

const normalizeDate = (input: string): string => formatDate(parseDate(input));

const toRawDate = (input: string): string => {
  const { epoch, offset } = parseDate(input);
  return epoch < 0 ? fail(`dates before 1970 are not supported ("${input}")`) : `${epoch} ${formatOffset(offset, '')}`;
};

const parseDuration = (input: string): number => {
  const parts = [...input.matchAll(DURATION_PART)];
  const consumed = parts
    .map(([part]) => part)
    .join('')
    .replace(/\s/g, '');
  return parts.length === 0 || consumed !== input.replace(/\s/g, '')
    ? fail(`invalid duration "${input}", use units w d h m s (e.g. 2h, 1d12h, 90m)`)
    : parts.reduce((total, [, amount, unit]) => total + Number(amount) * UNIT_SECONDS[unit.toLowerCase()], 0);
};

const shiftDate =
  (seconds: number) =>
  (input: string): string => {
    const timestamp = parseDate(input);
    return formatDate({ ...timestamp, epoch: timestamp.epoch + seconds });
  };

export { Timestamp, parseDate, formatDate, normalizeDate, toRawDate, parseDuration, shiftDate };
