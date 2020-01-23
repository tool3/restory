const { command } = require('../utils');
const { listCommits } = require('./list');

async function redate(argv) {
  const { sha, committerDate, authorDate, subject, value } = argv;
  const commits = sha ? [sha] : await listCommits(argv);
  const gitCmd =
    committerDate && authorDate
      ? ['export GIT_AUTHOR_DATE', 'export GIT_COMMITTER_DATE']
      : ['export GIT_COMMITTER_DATE'];
  await command({
    value,
    subject,
    name: 'date',
    script: `git show --no-patch --no-notes --pretty='%cd'`,
    gitCmd,
    commits
  });
}

module.exports = redate;
