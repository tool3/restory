import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fail } from './fail';
import { currentBranch, ensureClean, git, gitDir, remoteUrl } from './git';

interface Backup {
  readonly id: string;
  readonly createdAt: string;
  readonly branch?: string;
  readonly origin?: string;
}

interface Restored {
  readonly backup: Backup;
  readonly restoredOrigin: boolean;
}

interface UndoOptions {
  readonly id?: string;
  readonly cwd?: string;
}

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
  const backup = { id, createdAt, branch: await currentBranch(cwd), origin: await remoteUrl(cwd, 'origin') };
  await writeFile(metaPath(dir, id), JSON.stringify(backup, null, 2));
  return backup;
};

const readBackup = async (file: string): Promise<Backup> => JSON.parse(await readFile(file, 'utf8'));

const listBackups = async ({ cwd = process.cwd() }: { readonly cwd?: string } = {}): Promise<readonly Backup[]> => {
  const dir = await backupsDir(cwd);
  const files = await readdir(dir).catch((): readonly string[] => []);
  const backups = await Promise.all(
    files.filter((file) => file.endsWith('.json')).map((file) => readBackup(path.join(dir, file))),
  );
  return backups.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
};

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
  await git(cwd, ['fetch', '--quiet', '--update-head-ok', bundlePath(dir, backup.id), ...RESTORE_REFSPECS]);
  await git(cwd, ['reset', '--hard', '--quiet']);
  const restoredOrigin = await restoreOrigin(cwd, backup.origin);
  await Promise.all([rm(bundlePath(dir, backup.id), { force: true }), rm(metaPath(dir, backup.id), { force: true })]);
  return { backup, restoredOrigin };
};

export { Backup, Restored, UndoOptions, createBackup, listBackups, undo };
