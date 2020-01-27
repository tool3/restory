const { command } = require('../utils');
const { listCommits } = require('./list');

async function reauthor(argv) {
  const { sha } = argv;
  const commits = sha ? [sha] : await listCommits(argv);
  await command({
    argv,
    script: `git show --no-patch --no-notes --pretty='%an'`,
    name: 'author',
    gitCmd: `export GIT_AUTHOR_NAME`,
    commits,
  });
}

module.exports = reauthor;
