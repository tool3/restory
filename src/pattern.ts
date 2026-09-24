interface PatternOptions {
  readonly ignoreCase?: boolean;
  readonly fixed?: boolean;
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const withGlobal = (flags: string): string => (flags.includes('g') ? flags : `${flags}g`);

const toRegExp = (pattern: string | RegExp, { ignoreCase = false, fixed = false }: PatternOptions = {}): RegExp =>
  pattern instanceof RegExp
    ? new RegExp(pattern.source, withGlobal(pattern.flags))
    : new RegExp(fixed ? escapeRegExp(pattern) : pattern, `gm${ignoreCase ? 'i' : ''}`);

const matches = (regex: RegExp, text: string): boolean => text.search(regex) !== -1;

export { PatternOptions, toRegExp, matches };
