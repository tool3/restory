import { Backup, createBackup, pruneBackups } from './backup';
import { Edit, resolveEdits } from './edit';
import { runFilterRepo } from './filter-repo';
import { currentBranch, ensureClean, git, remoteUrl } from './git';
import { PatternOptions } from './pattern';
import { CommitChange, planRewrite, toFilterRepoPlan } from './plan';
import { Selection, selectCommits } from './select';

interface RewriteOptions extends PatternOptions {
  readonly edits: readonly Edit[];
  readonly select?: Selection;
  readonly keepOrigin?: boolean;
  readonly backup?: boolean;
  readonly keepBackups?: number;
  readonly dryRun?: boolean;
  readonly cwd?: string;
}

interface RemovedOrigin {
  readonly url: string;
  readonly branch?: string;
}

interface RewriteResult {
  readonly changes: readonly CommitChange[];
  readonly rewritten: Readonly<Record<string, string>>;
  readonly dryRun: boolean;
  readonly backup?: Backup;
  readonly prunedBackups: readonly Backup[];
  readonly removedOrigin?: RemovedOrigin;
  readonly duration: number;
}

const removeOrigin = async (cwd: string): Promise<RemovedOrigin | undefined> => {
  const url = await remoteUrl(cwd, 'origin');
  if (!url) return undefined;
  await git(cwd, ['remote', 'remove', 'origin']);
  return { url, branch: await currentBranch(cwd) };
};

const pick = (map: ReadonlyMap<string, string>, keys: readonly string[]): Readonly<Record<string, string>> =>
  Object.fromEntries(keys.filter((key) => map.has(key)).map((key) => [key, map.get(key) as string]));

const execute = async (
  cwd: string,
  changes: readonly CommitChange[],
  options: RewriteOptions,
): Promise<Omit<RewriteResult, 'changes' | 'dryRun' | 'duration'>> => {
  await ensureClean(cwd);
  const backup = options.backup === false ? undefined : await createBackup(cwd);
  const commitMap = await runFilterRepo(cwd, toFilterRepoPlan(changes));
  const removedOrigin = options.keepOrigin ? undefined : await removeOrigin(cwd);
  const prunedBackups = backup ? await pruneBackups(cwd, options.keepBackups) : [];
  return {
    backup,
    prunedBackups,
    removedOrigin,
    rewritten: pick(
      commitMap,
      changes.map(({ sha }) => sha),
    ),
  };
};

const rewrite = async (options: RewriteOptions): Promise<RewriteResult> => {
  const started = Date.now();
  const cwd = options.cwd ?? process.cwd();
  const edits = resolveEdits(options.edits, options);
  const changes = planRewrite(await selectCommits(cwd, options.select), edits);
  const dryRun = options.dryRun ?? false;
  const outcome =
    dryRun || changes.length === 0 ? { rewritten: {}, prunedBackups: [] } : await execute(cwd, changes, options);
  return { ...outcome, changes, dryRun, duration: Date.now() - started };
};

export { RewriteOptions, RewriteResult, RemovedOrigin, rewrite };
