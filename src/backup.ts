import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fail } from './fail';
import { currentBranch, ensureClean, git, gitDir, remoteUrl } from './git';

interface Backup {
  readonly id: string;
  readonly createdAt: string;
  readonly head: string;
  readonly branch?: string;
  readonly origin?: string;
}

interface BackupsOptions {
  readonly cwd?: string;
}

interface Restored {
  readonly backup: Backup;
  readonly restoredOrigin: boolean;
}

interface UndoOptions {
  readonly id?: string;
  readonly cwd?: string;
}

const DEFAULT_KEEP = 5;

const RESTORE_REFSPECS = ['+refs/heads/*:refs/heads/*', '+refs/tags/*:refs/tags/*', '+refs/remotes/*:refs/remotes/*'];

const backupsDir = async (cwd: string): Promise<string> => path.join(await gitDir(cwd), 'restory', 'backups');

const bundlePath = (dir: string, id: string): string => path.join(dir, `${id}.bundle`);
const metaPath = (dir: string, id: string): string => path.join(dir, `${id}.json`);

const createBackup = async (cwd: string): Promise<Backup> => {
  const dir = await backupsDir(cwd);
  const createdAt = new Date().toISOString();
  const id = createdAt.replace(/[:.]/g, '-');
  await mkdir(dir, { recursive: true });
  await git(cwd, ['bundle', 'create', bundlePath(dir, id), '--all']);
  const backup = {
    id,
    createdAt,
    head: (await git(cwd, ['rev-parse', 'HEAD'])).trim(),
    branch: await currentBranch(cwd),
    origin: await remoteUrl(cwd, 'origin'),
  };
  await writeFile(metaPath(dir, id), JSON.stringify(backup, null, 2));
  return backup;
};

const readBackup = async (file: string): Promise<Backup> => JSON.parse(await readFile(file, 'utf8'));

const listBackups = async ({ cwd = process.cwd() }: BackupsOptions = {}): Promise<readonly Backup[]> => {
  const dir = await backupsDir(cwd);
  const files = await readdir(dir).catch((): readonly string[] => []);
  const backups = await Promise.all(
    files.filter((file) => file.endsWith('.json')).map((file) => readBackup(path.join(dir, file))),
  );
  return backups.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
};

const removeBackup =
  (dir: string) =>
  async (backup: Backup): Promise<Backup> => {
    await Promise.all([rm(bundlePath(dir, backup.id), { force: true }), rm(metaPath(dir, backup.id), { force: true })]);
    return backup;
  };

const removeBackups = async (cwd: string, backups: readonly Backup[]): Promise<readonly Backup[]> =>
  Promise.all(backups.map(removeBackup(await backupsDir(cwd))));

const pruneBackups = async (cwd: string, keep: number = DEFAULT_KEEP): Promise<readonly Backup[]> =>
  keep > 0 ? removeBackups(cwd, (await listBackups({ cwd })).slice(keep)) : [];

const clearBackups = async ({ cwd = process.cwd() }: BackupsOptions = {}): Promise<readonly Backup[]> =>
  removeBackups(cwd, await listBackups({ cwd }));

const findBackup = (backups: readonly Backup[], id?: string): Backup =>
  (id ? backups.find((backup) => backup.id === id) : backups[0]) ??
  fail(id ? `no backup named "${id}"` : 'no backups to restore');

const restoreOrigin = async (cwd: string, origin?: string): Promise<boolean> => {
  if (!origin || (await remoteUrl(cwd, 'origin'))) return false;
  await git(cwd, ['remote', 'add', 'origin', origin]);
  return true;
};

const undo = async ({ id, cwd = process.cwd() }: UndoOptions = {}): Promise<Restored> => {
  const backup = findBackup(await listBackups({ cwd }), id);
  const dir = await backupsDir(cwd);
  await ensureClean(cwd);
  // detaching first lets --prune delete a branch that did not exist at backup time, even the checked-out one.
  await git(cwd, ['checkout', '--quiet', '--detach']);
  await git(cwd, ['fetch', '--quiet', '--prune', bundlePath(dir, backup.id), ...RESTORE_REFSPECS]);
  await git(cwd, ['checkout', '--quiet', '--force', backup.branch ?? backup.head]);
  const restoredOrigin = await restoreOrigin(cwd, backup.origin);
  await removeBackup(dir)(backup);
  return { backup, restoredOrigin };
};

export {
  Backup,
  BackupsOptions,
  Restored,
  UndoOptions,
  DEFAULT_KEEP,
  createBackup,
  pruneBackups,
  clearBackups,
  listBackups,
  undo,
};
