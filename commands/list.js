const table = require('cli-table3');
const { color, execute } = require('../utils');

async function listCommits({ script }) {
  const { stdout } = await execute(script, { maxBuffer: 10000 * 10000 });
  return stdout.trim().split('\n');
}

async function list(argv) {
  const commits = await listCommits(argv);
  const chars = argv.compact
    ? {
        chars: {
          mid: '',
          'left-mid': '',
          'mid-mid': '',
          'right-mid': '',
        },
      }
    : undefined;
  
  const tableOptions = { style: { head: [], border: [] }, ...chars  };
  if (argv.truncate) {
    tableOptions.colWidths = [12, 50, 33, 17, 30] 
  }
  const t = new table(tableOptions);
  t.push([
    { content: color('SHA', 'whiteBold'), hAlign: 'center' },
    { content: color('MESSAGE', 'whiteBold'), hAlign: 'center' },
    { content: color('DATE', 'whiteBold'), hAlign: 'center' },
    { content: color('AUTHOR', 'whiteBold'), hAlign: 'center' },
    { content: color('EMAIL', 'whiteBold'), hAlign: 'center' },
  ]);
  for (commit of commits) {
    const formattedCommit = commit.split('  ');
    t.push([
      { content: color(formattedCommit[0], 'blue'), hAlign: 'center'},
      {content: color(formattedCommit[1], 'cyan') },
      {content: color(formattedCommit[2], 'magenta') },
      { content: color(formattedCommit[3], 'yellow'), hAlign: 'center' },
      { content: color(formattedCommit[4], 'green'), hAlign: 'center' },
    ]);
  }
  console.log(t.toString());
}

module.exports = { list, listCommits };
