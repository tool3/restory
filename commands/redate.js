const { color, execute, filterBranch } = require("../utils");
const {listCommits} = require('./list');
const ora = require("ora");

async function changeCommitDate(sha, date, { committerDate, authorDate }) {
  let cmd = committerDate ? `export GIT_AUTHOR_DATE="${date}"
  ` : "";
  if (authorDate) cmd += `export GIT_COMMITTER_DATE="${date}"`;
  console.log(cmd)
  await filterBranch(sha, cmd);
}

async function changeCommitDates(list, argv) {
  const { subject, value, committerDate, authorDate } = argv;
  for (const sha of list) {
    const { stdout } = await execute(
      `git show --no-patch --no-notes --pretty='%cd' ${sha}`
    );
    let datesChanged = authorDate ? "author" : "";
    if (committerDate)
      datesChanged += datesChanged ? " & committer" : "committer";
    let date = stdout.trim();

    const spinner = ora();
    const shortSha = sha.slice(0, 7);

    spinner.start(
      `${color("rewriting", "white")} ${color(shortSha, "blue")} ${color(
        `${datesChanged} date to`,
        "dim"
      )} ${color(date, "magenta")}`
    );

    if (date.includes(subject)) {
      date = date.replace(subject, value);
    } else {
      const sub = color(subject, "dim");
      const timestamp = color(date, "dim");
      spinner.warn(
        sub +
          color(" not found in ", "yellow") +
          timestamp +
          color(" for commit ", "yellow") +
          color(sha, "dim")
      );
      continue;
    }

    await changeCommitDate(sha, date, argv);
    spinner.succeed();
  }
}

async function redate(argv) {
  const commits = argv.sha
    ? [argv.sha]
    : await listCommits(argv);
  await changeCommitDates(commits, argv);
  console.log(
    color("restory done for ", "green") +
      color(commits.length, "whiteBold") +
      color(" commits", "green")
  );
}

module.exports = redate;
