const { command } = require('../utils');
const { listCommits } = require('./list');

async function rewrite(argv) {
  if (!argv.gitFilterRepo) {
    throw '\x1b[31mnot supported with filter-branch\x1b[0m';
  }
  const { sha, message, date, author, email } = argv;
  const commits = sha ? [sha] : await listCommits(argv);
  const rewritten = { message, date, author, email };
  argv.rewritten = Object.keys(rewritten).reduce((acc, key, index) => {
      if (rewritten[key]) {
        acc[key] = {
            key: rewritten[key][1],
            value: rewritten[key][0],
            index
          };
      }
    return acc;
  }, {});
  await command({
    argv,
    script: `git show --no-patch --no-notes --pretty="%s--%cd--%an--%ae"`,
    name: 'author_email',
    commits,
  });
}

module.exports = rewrite;
