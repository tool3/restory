const { color, command, execute } = require('../utils');
const { listCommits } = require('./list');

async function filter(sha, cmd) {
    const script = `git filter-branch -f --msg-filter \
      'if [ $GIT_COMMIT = ${sha} ]
       then
          echo "${cmd}"
       else 
          cat
       fi'`;
    await execute(script, { maxBuffer: 100000 * 100000 });
}

async function remsg(argv) {
  const { sha, value } = argv;
  const commits = sha ? [sha] : await listCommits(argv);
  await command({
    value,
    filter,
    script: "git show --no-patch --no-notes --pretty='%s'",
    name: 'message',
    commits,
  });
  console.log(
    color('restory done for ', 'green') +
      color(commits.length, 'whiteBold') +
      color(' commits', 'green')
  );
}

module.exports = remsg;
