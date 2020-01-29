const { command } = require('../utils');
const { listCommits } = require('./list');

async function remail(argv) {
  const { sha } = argv;
  const commits = sha ? [sha] : await listCommits(argv);

  await command({
    argv,
    script: `git show --no-patch --no-notes --pretty='%ae'`,
    name: 'author_email',
    gitCmd: `export GIT_AUTHOR_EMAIL`,
    commits,
    committer: true
  });
}

module.exports = remail;
