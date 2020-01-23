const { command } = require('../utils');
const { listCommits } = require('./list');

async function remail(argv) {
  const { sha, value } = argv;
  const commits = sha ? [sha] : await listCommits(argv);
  await command({
    value,
    script: "git show --no-patch --no-notes --pretty='%ae'",
    name: 'email',
    gitCmd: `export GIT_AUTHOR_EMAIL`,
    commits,
  });
}

module.exports = remail;
