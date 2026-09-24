#!/usr/bin/env node
import yargs, { Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { listBackups, undo } from './backup';
import { Edit } from './edit';
import { fail } from './fail';
import { grep, list } from './index';
import { toRegExp } from './pattern';
import { renderBackups, renderError, renderGrep, renderList, renderRewrite, renderUndo } from './render';
import { rewrite } from './rewrite';
import { Selection } from './select';
import { spin } from './spinner';
import { logo, theme } from './theme';

interface SelectionArgs {
  readonly sha?: readonly string[];
  readonly number?: number;
  readonly range?: readonly string[];
  readonly all?: boolean;
  readonly grep?: string;
  readonly in?: readonly string[];
  readonly ignoreCase: boolean;
  readonly fixedStrings: boolean;
}

interface OutputArgs {
  readonly json: boolean;
}

interface RewriteArgs extends SelectionArgs, OutputArgs {
  readonly dryRun: boolean;
  readonly keepOrigin: boolean;
  readonly backup: boolean;
  readonly quiet: boolean;
}

const MIGRATIONS: Readonly<Record<string, string>> = {
  redate:
    'restory set date <date>  ·  restory replace date <pattern> <replacement>  ·  restory shift back|forward <amount>',
  reauthor: 'restory set name <name>  ·  restory replace name <pattern> <replacement>',
  remail: 'restory set email <email>  ·  restory replace email <pattern> <replacement>',
  remsg: 'restory set message <message>  ·  restory replace message <pattern> <replacement>',
  rewrite: 'restory set <field> <value> [<field> <value>...]',
};

const OLD_ALIASES: Readonly<Record<string, string>> = {
  rd: 'redate',
  ra: 'reauthor',
  re: 'remail',
  rm: 'remsg',
  rw: 'rewrite',
};

// yargs trims leading whitespace from usage lines, non-breaking spaces survive it.
const helpLogo = (): string => logo('\u00a0');

const width = (): number => Math.min(process.stdout.columns ?? 100, 140);

const print = (text: string): void => void process.stdout.write(`${text}\n`);

const printJson = (value: unknown): void => print(JSON.stringify(value, null, 2));

const chunk = <T>(items: readonly T[], size: number): readonly (readonly T[])[] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));

const groups = (items: readonly string[], size: number, usage: string): readonly (readonly string[])[] =>
  items.length % size === 0 ? chunk(items, size) : fail(`expected ${usage}, got ${items.length} arguments`);

const patternOptions = ({ ignoreCase, fixedStrings }: SelectionArgs) => ({ ignoreCase, fixed: fixedStrings });

const selectionFrom = (argv: SelectionArgs): Selection => ({
  shas: argv.sha,
  last: argv.number || undefined,
  range: argv.range,
  all: argv.all,
  match: argv.grep === undefined ? undefined : { pattern: argv.grep, fields: argv.in, ...patternOptions(argv) },
});

const withSelection = <T>(y: Argv<T>) =>
  y
    .option('sha', { alias: 's', type: 'string', array: true, description: 'only these commits' })
    .option('number', { alias: 'n', type: 'number', description: 'only the last N commits' })
    .option('range', {
      alias: 'r',
      type: 'string',
      array: true,
      description: 'only a range: <from> <to> or "from..to"',
    })
    .option('all', { alias: 'a', type: 'boolean', description: 'walk every branch and tag, not just HEAD' })
    .option('grep', { alias: 'g', type: 'string', description: 'only commits matching this pattern' })
    .option('in', { type: 'string', array: true, description: 'fields searched by the pattern (default: all)' })
    .option('ignore-case', { alias: 'i', type: 'boolean', default: false, description: 'case-insensitive patterns' })
    .option('fixed-strings', {
      alias: 'F',
      type: 'boolean',
      default: false,
      description: 'treat patterns as plain text',
    })
    .group(['sha', 'number', 'range', 'all', 'grep', 'in', 'ignore-case', 'fixed-strings'], theme.strong('selection'));

const withRewrite = <T>(y: Argv<T>) =>
  withSelection(y)
    .option('dry-run', {
      alias: 'd',
      type: 'boolean',
      default: false,
      description: 'show what would change, rewrite nothing',
    })
    .option('keep-origin', {
      alias: 'k',
      type: 'boolean',
      default: false,
      description: 'keep the origin remote after rewriting',
    })
    .option('backup', { type: 'boolean', default: true, description: 'save a backup for `restory undo`' })
    .option('quiet', { alias: 'q', type: 'boolean', default: false, description: 'only print the summary' })
    .group(['dry-run', 'keep-origin', 'backup', 'quiet'], theme.strong('rewrite'));

const runRewrite = async (argv: RewriteArgs, edits: readonly Edit[]): Promise<void> => {
  const stop = argv.json || argv.dryRun ? () => undefined : spin(theme.muted('rewriting history'));
  const result = await rewrite({
    edits,
    select: selectionFrom(argv),
    ...patternOptions(argv),
    keepOrigin: argv.keepOrigin,
    backup: argv.backup,
    dryRun: argv.dryRun,
  }).finally(stop);
  return argv.json ? printJson(result) : print(renderRewrite(result, { quiet: argv.quiet, width: width() }));
};

const cli = yargs(hideBin(process.argv))
  .scriptName('restory')
  .usage(`${helpLogo()}\n\n  restory <command> [args] [options]`)
  .parserConfiguration({ 'parse-positional-numbers': false })
  .updateStrings({ 'Commands:': theme.strong('commands'), 'Options:': theme.strong('options') })
  .option('json', { type: 'boolean', default: false, description: 'print machine-readable JSON' })
  .option('logo', {
    alias: 'l',
    type: 'boolean',
    default: Boolean(process.stdout.isTTY),
    description: 'print the logo',
  })
  .middleware((argv) => (argv.logo && !argv.json ? print(`${logo()}\n`) : undefined))
  .command(
    ['list', 'ls'],
    'list commits',
    (y) =>
      withSelection(y).option('ellipsis', {
        alias: 'e',
        type: 'boolean',
        default: true,
        description: 'truncate columns to fit',
      }),
    async (argv) => {
      const commits = await list({ select: selectionFrom(argv) });
      return argv.json ? printJson(commits) : print(renderList(commits, { truncated: argv.ellipsis }));
    },
  )
  .command(
    'grep <pattern>',
    'search every commit field with a regex',
    (y) =>
      withSelection(y).positional('pattern', { type: 'string', demandOption: true, description: 'regular expression' }),
    async (argv) => {
      const query = { pattern: argv.pattern, fields: argv.in, ...patternOptions(argv) };
      const result = await grep({ ...query, select: selectionFrom(argv) });
      return argv.json ? printJson(result) : print(renderGrep(result, toRegExp(query.pattern, query), width()));
    },
  )
  .command(
    'set <field> <value> [more..]',
    'set fields to a new value',
    (y) =>
      withRewrite(y)
        .positional('field', {
          type: 'string',
          demandOption: true,
          description: 'message, name, email, date, author.name, …',
        })
        .positional('value', { type: 'string', demandOption: true, description: 'the new value' })
        .positional('more', { type: 'string', array: true, description: 'more <field> <value> pairs' })
        .example('restory set name "Jebediah Kerman" -n 5', 'rename the author and committer of the last 5 commits')
        .example('restory set message "fix: typo" -s 620a83b', 'reword one commit')
        .example('restory set date "2024-01-01 10:00" email jeb@ksp.com -s 620a83b', 'set several fields at once'),
    (argv) =>
      runRewrite(
        argv,
        groups([argv.field, argv.value, ...(argv.more ?? [])], 2, '<field> <value> pairs').map(([field, value]) => ({
          field,
          set: value,
        })),
      ),
  )
  .command(
    ['replace <field> <pattern> <replacement> [more..]', 'sub'],
    'replace regex matches inside fields',
    (y) =>
      withRewrite(y)
        .positional('field', {
          type: 'string',
          demandOption: true,
          description: 'message, name, email, date, author.name, …',
        })
        .positional('pattern', { type: 'string', demandOption: true, description: 'regular expression' })
        .positional('replacement', {
          type: 'string',
          demandOption: true,
          description: 'replacement text ($1, $& work)',
        })
        .positional('more', {
          type: 'string',
          array: true,
          description: 'more <field> <pattern> <replacement> triples',
        })
        .example('restory replace message Moon Mun', 'fix a word in every commit message')
        .example('restory replace email "@old\\.com$" "@new.com"', 'move every address to a new domain')
        .example('restory replace date ^2021 1984 -n 3', 'send the last 3 commits back to 1984'),
    (argv) =>
      runRewrite(
        argv,
        groups(
          [argv.field, argv.pattern, argv.replacement, ...(argv.more ?? [])],
          3,
          '<field> <pattern> <replacement> triples',
        ).map(([field, replace, replacement]) => ({ field, replace, with: replacement })),
      ),
  )
  .command(
    'shift <direction> <amount>',
    'move commit dates back or forward in time',
    (y) =>
      withRewrite(y)
        .positional('direction', { choices: ['back', 'forward'] as const, demandOption: true })
        .positional('amount', { type: 'string', demandOption: true, description: 'duration, e.g. 2h, 1d12h, 90m, 3w' })
        .option('field', { type: 'string', default: 'date', description: 'date, author.date or committer.date' })
        .example('restory shift back 2h -n 3', 'move the last 3 commits two hours earlier')
        .example('restory shift forward 1d --field author.date', 'move author dates a day later'),
    (argv) =>
      runRewrite(argv, [{ field: argv.field, shift: `${argv.direction === 'back' ? '-' : '+'}${argv.amount}` }]),
  )
  .command(
    'undo [id]',
    'restore the history saved before the last rewrite',
    (y) =>
      y
        .positional('id', { type: 'string', description: 'backup to restore (default: the latest)' })
        .option('list', { type: 'boolean', default: false, description: 'list saved backups' }),
    async (argv) => {
      if (argv.list) return argv.json ? printJson(await listBackups()) : print(renderBackups(await listBackups()));
      const restored = await undo({ id: argv.id });
      return argv.json ? printJson(restored) : print(renderUndo(restored));
    },
  )
  .command({
    command: `${Object.keys(MIGRATIONS)[0]} [args..]`,
    aliases: [...Object.keys(MIGRATIONS).slice(1), ...Object.keys(OLD_ALIASES)],
    describe: false,
    builder: (y) => y.strict(false),
    handler: async (argv) => {
      const used = String(argv._[0]);
      const name = OLD_ALIASES[used] ?? used;
      return fail(`"${used}" was removed in restory 3, use: ${MIGRATIONS[name]}`);
    },
  })
  .demandCommand(1, 'pick a command')
  .recommendCommands()
  .strict()
  .help()
  .alias('help', 'h')
  .version()
  .alias('version', 'v')
  .fail((message, error) => {
    throw error ?? new Error(message);
  })
  .wrap(Math.min(120, process.stdout.columns ?? 80));

Promise.resolve()
  .then(() => cli.parseAsync())
  .catch((error: Error) => {
    process.stderr.write(`${renderError(error.message)}\n`);
    process.exitCode = 1;
  });
