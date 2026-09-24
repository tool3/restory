import { Commit, LOG_FORMAT, parseLog } from './commit';
import { git, resolveCommit } from './git';
import { Query, search } from './search';

interface Selection {
  readonly shas?: readonly string[];
  readonly last?: number;
  readonly range?: string | readonly string[];
  readonly all?: boolean;
  readonly match?: Query;
}

const rangeSpec = (range: string | readonly string[]): string =>
  typeof range === 'string' ? range : range.length === 1 ? range[0] : `${range[0]}..${range[1]}`;

const revisions = async (cwd: string, { shas = [], last, range, all }: Selection): Promise<readonly string[]> =>
  shas.length > 0
    ? ['--no-walk=unsorted', ...(await Promise.all(shas.map((sha) => resolveCommit(cwd, String(sha)))))]
    : [...(last ? ['-n', String(last)] : []), ...(all ? ['--all'] : []), ...(range ? [rangeSpec(range)] : [])];

const selectCommits = async (cwd: string, selection: Selection = {}): Promise<readonly Commit[]> => {
  const args = ['log', '-z', `--format=${LOG_FORMAT}`, ...(await revisions(cwd, selection)), '--'];
  const commits = parseLog(await git(cwd, args));
  return selection.match ? search(commits, selection.match).map(({ commit }) => commit) : commits;
};

export { Selection, selectCommits };
