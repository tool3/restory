const { command, execute } = require('../utils');
const { listCommits } = require('./list');

async function filter(sha, cmd) {
  const shortSha = "${GIT_COMMIT:0:7}";
    const script = `git filter-branch -f --msg-filter \
      'if [ ${shortSha} = ${sha} ]
       then
          echo "${cmd}"
       else 
          cat
       fi'`;
    await execute(script, { maxBuffer: 100000 * 100000 });
}

async function remsg(argv) {
  const { sha } = argv;
  const commits = sha ? [sha] : await listCommits(argv);
  await command({
    argv,
    filter,
    script: `git show --no-patch --no-notes --pretty='%s'`,
    name: 'author_message',
    commits,
  });
}

module.exports = remsg;
