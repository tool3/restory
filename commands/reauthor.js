const { color, command } = require("../utils");
const { listCommits } = require("./list");

async function reauthor(argv) {
  const commits = argv.sha ? [argv.sha] : await listCommits(argv);
  await command({
    value: argv.value,
    script: "git show --no-patch --no-notes --pretty='%an'",
    name: "author",
    gitCmd: `export GIT_AUTHOR_NAME="${argv.value}"`,
    commits
  });
  console.log(
    color("restory done for ", "green") +
      color(commits.length, "whiteBold") +
      color(" commits", "green")
  );
}

module.exports = reauthor;
