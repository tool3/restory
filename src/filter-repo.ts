import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fail } from './fail';
import { ProcessError, describeFailure, gitDir, run } from './git';
import { FilterRepoPlan } from './plan';

const DRIVER = path.join(__dirname, '..', 'python', 'restory.py');

const python = (): string => process.env.RESTORY_PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');

const explain = (error: ProcessError): never =>
  error.code === 'ENOENT'
    ? fail(`${python()} was not found, restory needs Python 3 (set RESTORY_PYTHON to point at it)`)
    : fail(`git-filter-repo failed: ${describeFailure(error)}`);

const withPlanFile = async <T>(plan: FilterRepoPlan, use: (file: string) => Promise<T>): Promise<T> => {
  const dir = await mkdtemp(path.join(tmpdir(), 'restory-'));
  const file = path.join(dir, 'plan.json');
  await writeFile(file, JSON.stringify(plan));
  return use(file).finally(() => rm(dir, { recursive: true, force: true }));
};

const parseCommitMap = (content: string): ReadonlyMap<string, string> =>
  new Map(
    content
      .split('\n')
      .slice(1)
      .map((line) => line.trim().split(/\s+/))
      .filter((pair): pair is [string, string] => pair.length === 2),
  );

const readCommitMap = async (cwd: string): Promise<ReadonlyMap<string, string>> =>
  parseCommitMap(await readFile(path.join(await gitDir(cwd), 'filter-repo', 'commit-map'), 'utf8').catch(() => ''));

const runFilterRepo = async (cwd: string, plan: FilterRepoPlan): Promise<ReadonlyMap<string, string>> => {
  await withPlanFile(plan, (file) => run(python(), [DRIVER, file], cwd).catch(explain));
  return readCommitMap(cwd);
};

export { runFilterRepo };
