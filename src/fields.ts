import { fail } from './fail';

const FIELDS = [
  'message',
  'author.name',
  'author.email',
  'author.date',
  'committer.name',
  'committer.email',
  'committer.date',
] as const;

const SEARCH_FIELDS = ['sha', ...FIELDS] as const;

type Field = (typeof FIELDS)[number];
type SearchField = (typeof SEARCH_FIELDS)[number];

const EDIT_ALIASES: Readonly<Record<string, readonly Field[]>> = {
  msg: ['message'],
  name: ['author.name', 'committer.name'],
  email: ['author.email', 'committer.email'],
  date: ['author.date', 'committer.date'],
};

const SEARCH_ALIASES: Readonly<Record<string, readonly SearchField[]>> = {
  ...EDIT_ALIASES,
  author: ['author.name', 'author.email', 'author.date'],
  committer: ['committer.name', 'committer.email', 'committer.date'],
};

const normalize = (input: string): string => input.trim().toLowerCase().replace(/_/g, '.');

const unique = <T>(values: readonly T[]): readonly T[] => [...new Set(values)];

const resolver =
  <T extends string>(known: readonly T[], aliases: Readonly<Record<string, readonly T[]>>) =>
  (input: string): readonly T[] =>
    aliases[normalize(input)] ??
    (known.includes(normalize(input) as T)
      ? [normalize(input) as T]
      : fail(`unknown field "${input}", expected one of: ${[...Object.keys(aliases), ...known].join(', ')}`));

const resolveEditField = resolver(FIELDS, EDIT_ALIASES);

const resolveSearchFields = (inputs: readonly string[] = []): readonly SearchField[] =>
  inputs.length > 0 ? unique(inputs.flatMap(resolver(SEARCH_FIELDS, SEARCH_ALIASES))) : SEARCH_FIELDS;

const isDateField = (field: SearchField): boolean => field.endsWith('.date');

export { FIELDS, SEARCH_FIELDS, Field, SearchField, resolveEditField, resolveSearchFields, isDateField };
