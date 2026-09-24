import { Commit } from './commit';
import { Match, Query, search } from './search';
import { Selection, selectCommits } from './select';

interface ListOptions {
  readonly select?: Selection;
  readonly cwd?: string;
}

interface GrepOptions extends Query, ListOptions {}

interface GrepResult {
  readonly matches: readonly Match[];
  readonly searched: number;
}

const list = ({ select, cwd = process.cwd() }: ListOptions = {}): Promise<readonly Commit[]> =>
  selectCommits(cwd, select);

const grep = async ({ select, cwd, ...query }: GrepOptions): Promise<GrepResult> => {
  const commits = await list({ select, cwd });
  return { matches: search(commits, query), searched: commits.length };
};

export { list, grep, ListOptions, GrepOptions, GrepResult };
export { rewrite, RewriteOptions, RewriteResult, RemovedOrigin } from './rewrite';
export { undo, listBackups, Backup, Restored, UndoOptions } from './backup';
export { Commit, Identity } from './commit';
export { Edit, SetEdit, ReplaceEdit, ShiftEdit } from './edit';
export { FIELDS, SEARCH_FIELDS, Field, SearchField } from './fields';
export { Match, Hit, Query } from './search';
export { Selection } from './select';
export { Change, CommitChange } from './plan';
