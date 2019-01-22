#!/usr/bin/env node

const yargs = require("yargs");
const ora = require("ora");
const table = require("cli-table3");
const execute = require("util").promisify(require("child_process").exec);

const colors = {
  white: "\x1b[97m",
  whiteBold: "\x1b[97;1m",
  dim: "\x1b[0;2m",
  green: "\x1b[92m",
  red: "\x1b[91m",
  reset: "\x1b[0m",
};

async function changeCommitDate(sha, date, { committerDate, authorDate }) {
  const spinner = ora();
  let cmd = committerDate ? `export GIT_AUTHOR_DATE="${date}"` : "";
  let datesChanged = authorDate ? "author" : "";

  if (authorDate) cmd += `\nexport GIT_COMMITTER_DATE="${date}"`;
  if (committerDate)
    datesChanged += datesChanged ? " & committer" : "committer";

  const shortSha = sha.slice(0, 7);
  spinner.start(
    `${color("rewriting commit", "white")} ${color(
      shortSha,
      "dim"
    )} ${datesChanged} date to ${color(date, "dim")}`
  );
  const script = `git filter-branch -f --env-filter \
        'if [ $GIT_COMMIT = ${sha} ]
         then
             ${cmd}
         fi'`;
  await execute(script);
  spinner.succeed();
}

async function changeCommitDates(list, argv) {
  const { subject, value } = argv;
  for (const sha of list) {
    const { stdout } = await execute(
      `git show --no-patch --no-notes --pretty='%cd' ${sha}`
    );
    let date = stdout.trim();

    if (date.includes(subject)) {
      date = date.replace(subject, value);
    }

    await changeCommitDate(sha, date, argv);
  }
}

function color(msg, color) {
  return `${colors[color] || color}${msg}${colors.reset}`;
}

async function listCommits(withMessage = false) {
  const { stdout } = await execute(
    withMessage
      ? "git log --pretty=oneline --format='%H  %s  %cd'"
      : "git log --format=format:%H master"
  );
  return stdout.trim().split("\n");
}

yargs
  .config({})
  .command("$0 <subject> <value>", "rewrite commit dates", {}, async (argv) => {
    try {
      const commits = argv.sha ? [argv.sha] : await listCommits();
      await changeCommitDates(commits, argv);
      console.log(
        color("successfully rewrote ", "green") +
          color(commits.length, "whiteBold") +
          color(" commits", "green")
      );
    } catch (error) {
      throw color(error.message, "red");
    }
  })
  .command(
    ["list", "ls"],
    "list all commits",
    {
      compact: { alias: "c", description: "show compact table", default: true },
    },
    async (argv) => {
      try {
        const commits = await listCommits(true);
        const chars = argv.compact
          ? {
              chars: {
                mid: "",
                "left-mid": "",
                "mid-mid": "",
                "right-mid": "",
              },
            }
          : undefined;
        const t = new table({ style: { head: [], border: [] }, ...chars });
        t.push([
          { content: color("SHA", "whiteBold"), hAlign: "center" },
          { content: color("MSG", "whiteBold"), hAlign: "center" },
          { content: color("DATE", "whiteBold"), hAlign: "center" },
        ]);
        for (commit of commits) {
          const formattedCommit = commit.split("  ");
          t.push([formattedCommit[0], formattedCommit[1], formattedCommit[2]]);
        }
        console.log(t.toString());
      } catch (error) {
        throw color(error.message, "red");
      }
    }
  )
  .options("all", {
    alias: "a",
    type: "boolean",
    default: false,
    description: "rewrite all commits",
  })
  .options("sha", {
    alias: "s",
    type: "string",
    description: "commit sha to rewrite",
  })
  .options("authorDate", {
    alias: "d",
    type: "boolean",
    default: true,
    description: "change author date",
  })
  .options("committerDate", {
    alias: "c",
    type: "boolean",
    default: true,
    description: "change committer date",
  })
  .help()
  .wrap(90).argv;
