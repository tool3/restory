const { command } = require('../utils');
const { listCommits } = require('./list');

async function rewrite(argv) {
  const { sha, message, author_date, author_name, author_email } = argv;
  const rewritten = { message, author_date, author_name, author_email };
  const exists = Object.values(rewritten);

  if (!argv.gitFilterRepo) {
    throw new Error('\x1b[31mnot supported with filter-branch\x1b[0m');
  }

  if (!exists.some(opt => !!opt)) {
    throw new Error('\x1b[31mno options provided to rewrite\x1b[0m');
  }

  const commits = sha ? [sha] : await listCommits(argv);
  const options = Object.keys(rewritten);
  argv.rewritten = options.reduce((acc, key, index) => {
    if (rewritten[key]) {
      acc[key] = {
        key: rewritten[key][1],
        value: rewritten[key][0],
        index,
      };
    }
    return acc;
  }, {});
  await command({
    argv,
    script: `git show --no-patch --no-notes --pretty="%s--%cd--%an--%ae"`,
    name: 'rewrite',
    commits,
  });
}

module.exports = rewrite;
