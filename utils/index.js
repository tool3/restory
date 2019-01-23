const execute = require('util').promisify(require('child_process').exec);
const ora = require('ora');

const colors = {
  white: '\x1b[97m',
  whiteBold: '\x1b[97;1m',
  dim: '\x1b[0;2m',
  green: '\x1b[92m',
  yellow: '\x1b[33m',
  red: '\x1b[91m',
  blue: '\x1b[94m',
  magenta: '\x1b[95m',
  cyan: '\x1b[96m',
  underline: '\x1b[0;4m',
  reset: '\x1b[0m',
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
  await execute(script, { maxBuffer: 100000 * 100000 });
}

async function command({
  subject,
  value,
  script,
  name,
  gitCmd,
  commits,
  replace = false,
}) {
  for (const sha of commits) {
    const { stdout } = await execute(`${script} ${sha}`, {
      maxBuffer: 100000 * 100000,
    });
    const entity = stdout.trim();
    const spinner = ora({indent: 2});
    const shortSha = sha.slice(0, 7);
    const input = replace ? entity.replace(subject, value) : value;
    let cmd = '';
    if (Array.isArray(gitCmd)) {
      cmd = gitCmd.map((c) => `${c}="${input}"`).join('\n');
    } else {
      cmd = `${gitCmd}="${input}"`;
    }
    spinner.start(
      `${color('rewriting', 'white')} ${color(shortSha, 'blue')} ${color(
        name,
        'white'
      )} ${color(
        `${entity.replace(
          subject,
          `${colors.underline}${subject}${colors.dim}`
        )}`,
        'dim'
      )} ${color('to', 'white')} ${color(value, 'magenta')}`
    );

    await filterBranch(sha, cmd);
    spinner.succeed();
  }
}

module.exports = { color, execute, filterBranch, command };
