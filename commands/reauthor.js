const { color, command } = require('../utils');
const { listCommits } = require('./list');

async function reauthor(argv) {
  const { sha, value } = argv;
  const commits = sha ? [sha] : await listCommits(argv);
  await command({
    value,
    script: "git show --no-patch --no-notes --pretty='%an'",
    name: 'author',
    gitCmd: `export GIT_AUTHOR_NAME`,
    commits,
  });
  console.log(
    color('restory done for ', 'green') +
      color(commits.length, 'whiteBold') +
      color(' commits', 'green')
  );
}

module.exports = reauthor;
