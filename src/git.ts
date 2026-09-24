import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fail } from './fail';

interface ProcessError extends Error {
  readonly code?: string | number;
  readonly stderr?: string;
}

const execute = promisify(execFile);
const MAX_BUFFER = 1024 * 1024 * 1024;

const describeFailure = (error: ProcessError): string => String(error.stderr || error.message).trim();

const run = async (command: string, args: readonly string[], cwd: string): Promise<string> => {
  const { stdout } = await execute(command, args, { cwd, maxBuffer: MAX_BUFFER, encoding: 'utf8' });
  return stdout;
};

const git = (cwd: string, args: readonly string[]): Promise<string> =>
  run('git', args, cwd).catch((error: ProcessError) => fail(describeFailure(error)));

const tryGit = (cwd: string, args: readonly string[]): Promise<string | undefined> =>
  run('git', args, cwd).then(
    (output) => output.trim() || undefined,
    () => undefined,
  );

const gitDir = async (cwd: string): Promise<string> => (await git(cwd, ['rev-parse', '--absolute-git-dir'])).trim();

const isClean = async (cwd: string): Promise<boolean> =>
  (await git(cwd, ['status', '--porcelain', '--untracked-files=no'])).trim() === '';

const ensureClean = async (cwd: string): Promise<void> =>
  (await isClean(cwd)) ? undefined : fail('working tree has uncommitted changes, commit or stash them first');

const currentBranch = (cwd: string): Promise<string | undefined> =>
  tryGit(cwd, ['symbolic-ref', '--short', '-q', 'HEAD']);

const remoteUrl = (cwd: string, remote: string): Promise<string | undefined> =>
  tryGit(cwd, ['remote', 'get-url', remote]);

const resolveCommit = async (cwd: string, revision: string): Promise<string> =>
  (await tryGit(cwd, ['rev-parse', '--verify', '--quiet', `${revision}^{commit}`])) ??
  fail(`unknown commit "${revision}"`);

export { ProcessError, run, git, gitDir, ensureClean, currentBranch, remoteUrl, resolveCommit, describeFailure };
