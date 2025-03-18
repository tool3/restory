import { command } from '../utils';
import { Argv } from '../utils/types';
import { listCommits } from './list';

async function reauthor(argv: Argv): Promise<void> {
  const { sha } = argv;
  const commits = sha ? [sha] : await listCommits(argv);

  await command({
    argv,
    script: `git show --no-patch --no-notes --pretty='%an'`,
    name: 'author_name',
    gitCmd: `export GIT_AUTHOR_NAME`,
    commits
  });
}

export default reauthor;
