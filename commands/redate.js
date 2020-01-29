const { command } = require('../utils');
const { listCommits } = require('./list');

async function redate(argv) {
  const { sha, committer } = argv;
  const commits = sha ? [sha] : await listCommits(argv);
  const gitCmd =
    committer
      ? ['export GIT_AUTHOR_DATE', 'export GIT_COMMITTER_DATE']
      : ['export GIT_AUTHOR_DATE'];
  
  await command({
    argv,
    name: 'author_date',
    script: `git show --no-patch --no-notes --pretty='%cd'`,
    gitCmd,
    commits
  });
}

module.exports = redate;
