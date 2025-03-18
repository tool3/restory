import { command } from '../utils';
import { Argv } from '../utils/types';
import { listCommits } from './list';

async function rewrite(argv: Argv): Promise<void> {
  const { sha, message, author_date, author_name, author_email } = argv;
  const rewritten = { message, author_date, author_name, author_email };
  const exists = Object.values(rewritten);

  if (!argv.gitFilterRepo) {
    throw new Error('\x1b[31mnot supported with filter-branch\x1b[0m');
  }

  if (!exists.some(opt => !!opt)) {
    throw new Error('\x1b[31mno options provided to rewrite\x1b[0m');
  }

  const commits = sha ? [sha] : await listCommits(argv);
  const options = Object.keys(rewritten) as Array<keyof typeof rewritten>;

  argv.rewritten = options.reduce((acc, key, index) => {
    if (rewritten[key]) {
      acc[key] = {
        subject: Array.isArray(rewritten[key]) ? rewritten[key].join(' ') : rewritten[key],
        value: Array.isArray(rewritten[key]) ? rewritten[key].join(' ') : rewritten[key],
        index,
      };
    }
    return acc;
  }, {} as Argv['rewritten']);

  await command({
    argv,
    script: `git show --no-patch --no-notes --pretty="%s--%cd--%an--%ae"`,
    name: 'rewrite',
    commits,
  });
}

export default rewrite;
