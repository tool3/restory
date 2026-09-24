import Table from 'cli-table3';
import { Backup, Restored } from './backup';
import { Commit, shortSha, subjectOf } from './commit';
import { SearchField } from './fields';
import { GrepResult } from './index';
import { matches } from './pattern';
import { Change, CommitChange } from './plan';
import { RemovedOrigin, RewriteResult } from './rewrite';
import { Match } from './search';
import { Paint, highlight, theme } from './theme';

const INDENT = '  ';
const SHA_WIDTH = 7;
const FIELD_WIDTH = 15;
const DETAIL_INDENT = ' '.repeat(INDENT.length + SHA_WIDTH + 2);

const truncate = (text: string, width: number): string => {
  const chars = [...text];
  return chars.length > width ? `${chars.slice(0, Math.max(width - 1, 0)).join('')}…` : text;
};

const padEnd = (painted: string, raw: string, width: number): string =>
  `${painted}${' '.repeat(Math.max(width - [...raw].length, 0))}`;

const displayPattern = (regex: RegExp): string => `/${regex.source}/${regex.flags.replace(/[gm]/g, '')}`;

const displayDate = (iso: string): string => iso.replace('T', ' ').replace(/([+-]\d{2}:\d{2}|Z)$/, ' $1');

const segments = (text: string, regex: RegExp): readonly string[] => {
  const bounds = [...text.matchAll(regex)]
    .filter(([found]) => found.length > 0)
    .flatMap((found) => [found.index, found.index + found[0].length]);
  return [0, ...bounds, text.length]
    .slice(0, -1)
    .map((start, index, starts) => text.slice(start, starts[index + 1] ?? text.length));
};

const paintMatches = (text: string, regex: RegExp, base: Paint): string =>
  segments(text, regex)
    .map((segment, index) => (index % 2 === 1 ? highlight(segment) : segment ? base(segment) : ''))
    .join('');

const paintField = (field: SearchField): Paint =>
  field === 'sha'
    ? theme.sha
    : field === 'message'
      ? theme.message
      : field.endsWith('.date')
        ? theme.date
        : field.endsWith('.email')
          ? theme.email
          : theme.name;

const renderList = (commits: readonly Commit[], { truncated }: { readonly truncated: boolean }): string => {
  const table = new Table({
    style: { head: [], border: [] },
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    ...(truncated ? { colWidths: [11, 50, 28, 20, 30] } : {}),
  });
  const header = ['SHA', 'MESSAGE', 'DATE', 'AUTHOR', 'EMAIL'].map((title) => ({
    content: theme.strong(title),
    hAlign: 'center' as const,
  }));
  const rows = commits.map((commit) => [
    { content: theme.sha(shortSha(commit.sha)), hAlign: 'center' as const },
    theme.message(subjectOf(commit.message)),
    theme.date(displayDate(commit.author.date)),
    theme.name(commit.author.name),
    theme.email(commit.author.email),
  ]);
  table.push(header, ...rows);
  return table.toString();
};

const excerpt = (value: string, regex: RegExp): string => {
  const lines = value.split('\n');
  return lines.find((line) => matches(regex, line)) ?? lines[0];
};

const renderMatch =
  (regex: RegExp, width: number, nameWidth: number) =>
  ({ commit, hits }: Match): readonly string[] => {
    const name = truncate(commit.committer.name, nameWidth);
    const subject = truncate(subjectOf(commit.message), Math.max(width - DETAIL_INDENT.length - nameWidth - 2, 20));
    const inline = { sha: shortSha(commit.sha), 'committer.name': name, message: subject } as const;
    const hidden = hits.filter(({ field }) => {
      const shown = inline[field as keyof typeof inline];
      return shown === undefined || !matches(regex, shown);
    });
    const summary = `${INDENT}${paintMatches(inline.sha, regex, theme.sha)}  ${padEnd(
      paintMatches(name, regex, theme.name),
      name,
      nameWidth,
    )}  ${paintMatches(subject, regex, theme.message)}`;
    const details = hidden.map(
      ({ field, value }) =>
        `${DETAIL_INDENT}${theme.muted(field.padEnd(FIELD_WIDTH))} ${paintMatches(
          truncate(field === 'sha' ? value : excerpt(value, regex), width - DETAIL_INDENT.length - FIELD_WIDTH - 1),
          regex,
          paintField(field),
        )}`,
    );
    return [summary, ...details];
  };

const renderGrep = ({ matches: found, searched }: GrepResult, regex: RegExp, width: number): string => {
  const nameWidth = Math.min(Math.max(0, ...found.map(({ commit }) => [...commit.committer.name].length)), 24);
  const summary =
    found.length === 0
      ? `${INDENT}${theme.muted('no commits match')} ${theme.message(displayPattern(regex))}`
      : `${INDENT}${theme.strong(String(found.length))} ${theme.muted(`of ${searched} commits match`)} ${theme.message(displayPattern(regex))}`;
  return [...found.flatMap(renderMatch(regex, width, nameWidth)), '', summary].join('\n');
};

const displayValue = (value: string, width: number): string =>
  truncate(value.includes('\n') ? `${subjectOf(value)} …` : value, width);

const renderFieldChange =
  (width: number) =>
  ({ field, before, after }: Change): string =>
    `${DETAIL_INDENT}${theme.field(field.padEnd(FIELD_WIDTH))} ${theme.before(displayValue(before, width))} ${theme.muted(
      '→',
    )} ${theme.after(displayValue(after, width))}`;

const renderCommitChange =
  (rewritten: Readonly<Record<string, string>>, dryRun: boolean, width: number) =>
  ({ sha, subject, changes }: CommitChange): readonly string[] => {
    const symbol = dryRun ? theme.muted('•') : theme.success('✔');
    const target = rewritten[sha] ? ` ${theme.muted('→')} ${theme.sha(shortSha(rewritten[sha]))}` : '';
    const valueWidth = Math.max(Math.floor((width - DETAIL_INDENT.length - FIELD_WIDTH - 4) / 2), 16);
    return [
      `${INDENT}${symbol} ${theme.sha(shortSha(sha))}${target}  ${theme.message(truncate(subject, width - 30))}`,
      ...changes.map(renderFieldChange(valueWidth)),
    ];
  };

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

const renderSummary = ({ changes, dryRun, duration }: RewriteResult): string =>
  changes.length === 0
    ? `${INDENT}${theme.muted('nothing to rewrite, no commit would change')}`
    : dryRun
      ? `${INDENT}${theme.warning('dry run')} ${theme.muted('· would rewrite')} ${theme.strong(
          plural(changes.length, 'commit'),
        )} ${theme.muted('· nothing was changed')}`
      : `${INDENT}${theme.success('restory rewrote')} ${theme.strong(plural(changes.length, 'commit'))} ${theme.muted(
          `in ${(duration / 1000).toFixed(2)}s`,
        )}`;

const renderBackupNote = (backup: Backup | undefined, pruned: readonly Backup[]): readonly string[] =>
  backup
    ? [
        `${INDENT}${theme.muted('backup saved · run')} ${theme.strong('restory undo')} ${theme.muted('to restore it')}${
          pruned.length > 0 ? theme.muted(` · removed ${plural(pruned.length, 'older backup')}`) : ''
        }`,
      ]
    : [];

const renderOriginWarning = (removed?: RemovedOrigin): readonly string[] =>
  removed
    ? [
        '',
        `${INDENT}${theme.warning('⚠ origin was removed')}`,
        `${INDENT}  ${theme.muted('the rewritten history no longer matches')} ${theme.strong(removed.url)}`,
        `${INDENT}  ${theme.muted('to publish it, reconnect and force push:')}`,
        `${INDENT}    ${theme.strong(`git remote add origin ${removed.url}`)}`,
        `${INDENT}    ${theme.strong(`git push --force origin ${removed.branch ?? '<branch>'}`)}`,
        `${INDENT}  ${theme.muted('pass')} ${theme.strong('--keep-origin')} ${theme.muted('to keep origin next time')}`,
      ]
    : [];

const renderRewrite = (
  result: RewriteResult,
  { quiet, width }: { readonly quiet: boolean; readonly width: number },
): string =>
  [
    ...(quiet ? [] : result.changes.flatMap(renderCommitChange(result.rewritten, result.dryRun, width))),
    ...(quiet || result.changes.length === 0 ? [] : ['']),
    renderSummary(result),
    ...renderBackupNote(result.backup, result.prunedBackups),
    ...renderOriginWarning(result.removedOrigin),
  ].join('\n');

const renderBackups = (backups: readonly Backup[]): string =>
  backups.length === 0
    ? `${INDENT}${theme.muted('no backups yet')}`
    : backups
        .map(
          ({ id, createdAt, branch, origin }, index) =>
            `${INDENT}${index === 0 ? theme.success('●') : theme.muted('○')} ${theme.sha(id)}  ${theme.date(
              displayDate(createdAt.slice(0, 19)),
            )}  ${theme.name(branch ?? 'detached')}${origin ? `  ${theme.muted(origin)}` : ''}`,
        )
        .join('\n');

const renderUndo = ({ backup, restoredOrigin }: Restored): string =>
  [
    `${INDENT}${theme.success('✔ restored')} ${theme.strong(backup.id)} ${theme.muted(
      `from ${displayDate(backup.createdAt.slice(0, 19))}`,
    )}`,
    ...(restoredOrigin && backup.origin
      ? [`${INDENT}${theme.muted('re-added origin')} ${theme.strong(backup.origin)}`]
      : []),
  ].join('\n');

const renderCleared = (removed: readonly Backup[]): string =>
  removed.length === 0
    ? `${INDENT}${theme.muted('no backups to remove')}`
    : `${INDENT}${theme.success('✔ removed')} ${theme.strong(plural(removed.length, 'backup'))}`;

const renderError = (message: string): string => `${INDENT}${theme.error('✖')} ${theme.error(message)}`;

export { renderList, renderGrep, renderRewrite, renderBackups, renderUndo, renderCleared, renderError };
