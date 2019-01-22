const execute = require("util").promisify(require("child_process").exec);

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

module.exports = { color, execute, filterBranch }