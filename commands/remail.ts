import { command } from '../utils';
import { Argv } from '../utils/types';
import { listCommits } from './list';

async function remail(argv: Argv): Promise<void> {
  const { sha } = argv;
  const commits = sha ? [sha] : await listCommits(argv);

  await command({
    argv,
    script: `git show --no-patch --no-notes --pretty='%ae'`,
    name: 'author_email',
    gitCmd: `export GIT_AUTHOR_EMAIL`,
    commits
  });
}

export default remail;
