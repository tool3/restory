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

const space = (num = 4) => ' '.repeat(num);

const baseCmd = sha => `git filter-repo --commit-callback '
  ${sha ? `if (commit.original_id[:7] == b"${sha}"):` : ''}
`

async function gitFilterRepo(sha, name, value, committer = false) {
  const [subject, verb] = name.split('_')
  const baseScript = `${baseCmd(sha)}${space()}commit.${subject}_${verb} = b"${value}"`;
  const script = committer ? `${baseScript}\n${space()}commit.committer_${verb} = b"${value}"'` : `${baseScript}'`
  return await execute(script);
}

async function gitCommand(argv) {
  return argv.gitFilterRepo ? baseCmd(argv.sha) : 'git filter-branch -f --env-filter'
}

async function filterBranch(argv, cmd) {
  const shortSha = "${GIT_COMMIT:0:7}";
  const script = `${await gitCommand(argv)} \
    'if [ ${shortSha} = ${argv.sha} ]
     then
        ${cmd}
     fi'`;
  await execute(script, { maxBuffer: 100000 * 100000 });
}

async function command({
  filter = filterBranch,
  argv,
  script,
  name,
  gitCmd,
  commits,
  committer = false
}) {
  // TODOs
  // - support multiple commits
  // - don't run when replace value is same as stdout
  // - show pre-run info
  // - add rewrite api
  const {subject, value} = argv;
  for (const sha of commits) {
    const { stdout } = await execute(`${script} ${sha}`, {
      maxBuffer: 100000 * 100000,
    });
    const entity = stdout.trim();
    const spinner = ora({ indent: 2 });
    const shortSha = sha.slice(0, 7);
    const input = subject ? entity.replace(subject, value) : value;
    let cmd = '';
    if (gitCmd) {
      if (Array.isArray(gitCmd)) {
        cmd = gitCmd.map((c) => `${c}="${input}"`).join('\n');
      } else {
        cmd = `${gitCmd}="${input}"`;
      }
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
    
    argv.gitFilterRepo ? await gitFilterRepo(argv.sha, name, argv.value, committer) : await filter(argv, cmd || value);
    spinner.succeed();
  }
  console.log(
    color('restory done for ', 'green') +
      color(commits.length, 'whiteBold') +
      color(' commits', 'green')
  );
}

function logo() {
  return `  [38;2;247;104;31m [39m[38;2;251;92;40m [39m[38;2;253;80;50m [39m[38;2;254;68;60m [39m[38;2;254;57;71m [39m[38;2;253;47;83m [39m[38;2;250;38;95m [39m[38;2;246;29;107m [39m[38;2;241;22;120m [39m[38;2;235;15;132m [39m[38;2;228;10;145m [39m[38;2;219;6;158m [39m[38;2;210;3;170m [39m[38;2;200;1;182m_[39m[38;2;189;1;193m [39m[38;2;178;1;203m [39m[38;2;166;3;213m [39m[38;2;154;7;222m [39m[38;2;141;11;230m [39m[38;2;129;17;237m [39m[38;2;116;24;243m [39m[38;2;103;32;248m [39m[38;2;91;40;251m [39m[38;2;79;50;253m [39m[38;2;68;61;254m [39m[38;2;57;72;254m [39m[38;2;46;83;253m [39m[38;2;37;95;250m [39m[38;2;29;108;246m [39m[38;2;21;120;241m[39m
  [38;2;251;92;40m [39m[38;2;253;80;50m_[39m[38;2;254;68;60m_[39m[38;2;254;57;71m_[39m[38;2;253;47;83m [39m[38;2;250;38;95m_[39m[38;2;246;29;107m_[39m[38;2;241;22;120m_[39m[38;2;235;15;132m [39m[38;2;228;10;145m_[39m[38;2;219;6;158m_[39m[38;2;210;3;170m_[39m[38;2;200;1;182m|[39m[38;2;189;1;193m [39m[38;2;178;1;203m|[39m[38;2;166;3;213m_[39m[38;2;154;7;222m [39m[38;2;141;11;230m_[39m[38;2;129;17;237m_[39m[38;2;116;24;243m_[39m[38;2;103;32;248m [39m[38;2;91;40;251m_[39m[38;2;79;50;253m_[39m[38;2;68;61;254m_[39m[38;2;57;72;254m [39m[38;2;46;83;253m_[39m[38;2;37;95;250m [39m[38;2;29;108;246m_[39m[38;2;21;120;241m [39m[38;2;15;133;235m[39m
  [38;2;253;80;50m|[39m[38;2;254;68;60m [39m[38;2;254;57;71m [39m[38;2;253;47;83m_[39m[38;2;250;38;95m|[39m[38;2;246;29;107m [39m[38;2;241;22;120m-[39m[38;2;235;15;132m_[39m[38;2;228;10;145m|[39m[38;2;219;6;158m_[39m[38;2;210;3;170m [39m[38;2;200;1;182m-[39m[38;2;189;1;193m|[39m[38;2;178;1;203m [39m[38;2;166;3;213m [39m[38;2;154;7;222m_[39m[38;2;141;11;230m|[39m[38;2;129;17;237m [39m[38;2;116;24;243m.[39m[38;2;103;32;248m [39m[38;2;91;40;251m|[39m[38;2;79;50;253m [39m[38;2;68;61;254m [39m[38;2;57;72;254m_[39m[38;2;46;83;253m|[39m[38;2;37;95;250m [39m[38;2;29;108;246m|[39m[38;2;21;120;241m [39m[38;2;15;133;235m|[39m[38;2;10;146;227m[39m
  [38;2;254;68;60m|[39m[38;2;254;57;71m_[39m[38;2;253;47;83m|[39m[38;2;250;38;95m [39m[38;2;246;29;107m|[39m[38;2;241;22;120m_[39m[38;2;235;15;132m_[39m[38;2;228;10;145m_[39m[38;2;219;6;158m|[39m[38;2;210;3;170m_[39m[38;2;200;1;182m_[39m[38;2;189;1;193m_[39m[38;2;178;1;203m|[39m[38;2;166;3;213m_[39m[38;2;154;7;222m|[39m[38;2;141;11;230m [39m[38;2;129;17;237m|[39m[38;2;116;24;243m_[39m[38;2;103;32;248m_[39m[38;2;91;40;251m_[39m[38;2;79;50;253m|[39m[38;2;68;61;254m_[39m[38;2;57;72;254m|[39m[38;2;46;83;253m [39m[38;2;37;95;250m|[39m[38;2;29;108;246m_[39m[38;2;21;120;241m [39m[38;2;15;133;235m [39m[38;2;10;146;227m|[39m[38;2;5;158;219m[39m
  [38;2;254;57;71m [39m[38;2;253;47;83m [39m[38;2;250;38;95m [39m[38;2;246;29;107m [39m[38;2;241;22;120m [39m[38;2;235;15;132m [39m[38;2;228;10;145m [39m[38;2;219;6;158m [39m[38;2;210;3;170m [39m[38;2;200;1;182m [39m[38;2;189;1;193m [39m[38;2;178;1;203m [39m[38;2;166;3;213m [39m[38;2;154;7;222m [39m[38;2;141;11;230m [39m[38;2;129;17;237m [39m[38;2;116;24;243m [39m[38;2;103;32;248m [39m[38;2;91;40;251m [39m[38;2;79;50;253m [39m[38;2;68;61;254m [39m[38;2;57;72;254m [39m[38;2;46;83;253m [39m[38;2;37;95;250m [39m[38;2;29;108;246m|[39m[38;2;21;120;241m_[39m[38;2;15;133;235m_[39m[38;2;10;146;227m_[39m[38;2;5;158;219m|[39m[38;2;3;170;210m[39m
  [38;2;253;47;83m[39m
  `
}

module.exports = { color, execute, filterBranch, command, logo };



// author_name,
// author_email,
// author_date,
// committer_name,
// committer_email,
// committer_date,
// message,
// file_changes,
// parents,
// original_id

// commit.message = "hello" if commit.original_id == "db78265" else commit.message = commit.message
