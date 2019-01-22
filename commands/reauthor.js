const { color, execute, filterBranch } = require("../utils");
const {listCommits} = require('./list');
const ora = require("ora");

async function changeAuthor(sha, author) {
  const cmd = `export GIT_AUTHOR_NAME="${author}"`;
  await filterBranch(sha, cmd);
}

async function changeCommitAuthor(list, argv) {
  const { value } = argv;
  for (const sha of list) {
    const { stdout } = await execute(
      `git show --no-patch --no-notes --pretty='%an' ${sha}`
    );
    
    const author = stdout.trim();
    const spinner = ora();
    const shortSha = sha.slice(0, 7);

    spinner.start(
      `${color("rewriting", "white")} ${color(shortSha, "blue")} ${color(
        `author ${author} to `,
        "dim"
      )} ${color(value, "magenta")}`
    );

    await changeAuthor(sha, value);
    spinner.succeed();
  }
}

async function reauthor(argv) {
  const commits = argv.sha
    ? [argv.sha]
    : await listCommits(argv);
  await changeCommitAuthor(commits, argv);
  console.log(
    color("restory done for ", "green") +
      color(commits.length, "whiteBold") +
      color(" commits", "green")
  );
}

module.exports = reauthor;
