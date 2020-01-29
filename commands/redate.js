const { command } = require('../utils');
const { listCommits } = require('./list');

async function redate(argv) {
  const { sha, committerDate, authorDate } = argv;
  const commits = sha ? [sha] : await listCommits(argv);
  const gitCmd =
    committerDate && authorDate
      ? ['export GIT_AUTHOR_DATE', 'export GIT_COMMITTER_DATE']
      : ['export GIT_COMMITTER_DATE'];
  
  await command({
    argv,
    name: 'author_date',
    script: `git show --no-patch --no-notes --pretty='%cd'`,
    gitCmd,
    commits,
    committer: true
  });
}

module.exports = redate;
