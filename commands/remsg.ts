import { command, execute } from '../utils';
import { Argv } from '../utils/types';
import { listCommits } from './list';

async function filter(sha: string, cmd: string): Promise<void> {
  const shortSha = `${sha.substring(0, 7)}`;
  const script = `git filter-branch -f --msg-filter \
    'if [ ${shortSha} = ${sha} ]
     then
        echo "${cmd}"
     else 
        cat
     fi'`;
  await execute(script, { maxBuffer: 100000 * 100000 });
}

async function remsg(argv: Argv): Promise<void> {
  const { sha } = argv;
  const commits = sha ? [sha] : await listCommits(argv);
  await command({
    argv,
    filter,
    script: `git show --no-patch --no-notes --pretty='%s'`,
    name: 'message',
    commits,
  });
}

export default remsg;
