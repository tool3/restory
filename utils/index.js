const execute = require("util").promisify(require("child_process").exec);
const ora = require("ora");

const colors = {
  white: "\x1b[97m",
  whiteBold: "\x1b[97;1m",
  dim: "\x1b[0;2m",
  green: "\x1b[92m",
  yellow: "\x1b[33m",
  red: "\x1b[91m",
  blue: "\x1b[94m",
  magenta: "\x1b[95m",
  cyan: "\x1b[96m",
  reset: "\x1b[0m",
};

function color(msg, color) {
  return `${colors[color] || color}${msg}${colors.reset}`;
}

async function filterBranch(sha, cmd) {
  const script = `git filter-branch -f --env-filter \
    'if [ $GIT_COMMIT = ${sha} ]
     then
         ${cmd}
     fi'`;
  await execute(script);
}

async function command({ value, script, name, gitCmd, commits }) {
  for (const sha of commits) {
    const { stdout } = await execute(`${script} ${sha}`);
    const subject = stdout.trim();
    const spinner = ora();
    const shortSha = sha.slice(0, 7);

    spinner.start(
      `${color("rewriting", "white")} ${color(shortSha, "blue")} ${color(
        `${name} ${subject} to `,
        "dim"
      )} ${color(value, "magenta")}`
    );

    await filterBranch(sha, gitCmd);
    spinner.succeed();
  }
}

module.exports = { color, execute, filterBranch, command };
