#!/usr/bin/env node

const yargs = require('yargs');
const { color } = require('./utils');
const { list } = require('./commands/list');
const redate = require('./commands/redate');
const reauthor = require('./commands/reauthor');
const remail = require('./commands/remail');
const remsg = require('./commands/remsg');

function logo() {
  const string = `
[38;2;243;117;23m[39m
  [38;2;247;104;31m [39m[38;2;251;92;40m [39m[38;2;253;80;50m [39m[38;2;254;68;60m [39m[38;2;254;57;71m [39m[38;2;253;47;83m [39m[38;2;250;38;95m [39m[38;2;246;29;107m [39m[38;2;241;22;120m [39m[38;2;235;15;132m [39m[38;2;228;10;145m [39m[38;2;219;6;158m [39m[38;2;210;3;170m [39m[38;2;200;1;182m_[39m[38;2;189;1;193m [39m[38;2;178;1;203m [39m[38;2;166;3;213m [39m[38;2;154;7;222m [39m[38;2;141;11;230m [39m[38;2;129;17;237m [39m[38;2;116;24;243m [39m[38;2;103;32;248m [39m[38;2;91;40;251m [39m[38;2;79;50;253m [39m[38;2;68;61;254m [39m[38;2;57;72;254m [39m[38;2;46;83;253m [39m[38;2;37;95;250m [39m[38;2;29;108;246m [39m[38;2;21;120;241m[39m
  [38;2;251;92;40m [39m[38;2;253;80;50m_[39m[38;2;254;68;60m_[39m[38;2;254;57;71m_[39m[38;2;253;47;83m [39m[38;2;250;38;95m_[39m[38;2;246;29;107m_[39m[38;2;241;22;120m_[39m[38;2;235;15;132m [39m[38;2;228;10;145m_[39m[38;2;219;6;158m_[39m[38;2;210;3;170m_[39m[38;2;200;1;182m|[39m[38;2;189;1;193m [39m[38;2;178;1;203m|[39m[38;2;166;3;213m_[39m[38;2;154;7;222m [39m[38;2;141;11;230m_[39m[38;2;129;17;237m_[39m[38;2;116;24;243m_[39m[38;2;103;32;248m [39m[38;2;91;40;251m_[39m[38;2;79;50;253m_[39m[38;2;68;61;254m_[39m[38;2;57;72;254m [39m[38;2;46;83;253m_[39m[38;2;37;95;250m [39m[38;2;29;108;246m_[39m[38;2;21;120;241m [39m[38;2;15;133;235m[39m
  [38;2;253;80;50m|[39m[38;2;254;68;60m [39m[38;2;254;57;71m [39m[38;2;253;47;83m_[39m[38;2;250;38;95m|[39m[38;2;246;29;107m [39m[38;2;241;22;120m-[39m[38;2;235;15;132m_[39m[38;2;228;10;145m|[39m[38;2;219;6;158m_[39m[38;2;210;3;170m [39m[38;2;200;1;182m-[39m[38;2;189;1;193m|[39m[38;2;178;1;203m [39m[38;2;166;3;213m [39m[38;2;154;7;222m_[39m[38;2;141;11;230m|[39m[38;2;129;17;237m [39m[38;2;116;24;243m.[39m[38;2;103;32;248m [39m[38;2;91;40;251m|[39m[38;2;79;50;253m [39m[38;2;68;61;254m [39m[38;2;57;72;254m_[39m[38;2;46;83;253m|[39m[38;2;37;95;250m [39m[38;2;29;108;246m|[39m[38;2;21;120;241m [39m[38;2;15;133;235m|[39m[38;2;10;146;227m[39m
  [38;2;254;68;60m|[39m[38;2;254;57;71m_[39m[38;2;253;47;83m|[39m[38;2;250;38;95m [39m[38;2;246;29;107m|[39m[38;2;241;22;120m_[39m[38;2;235;15;132m_[39m[38;2;228;10;145m_[39m[38;2;219;6;158m|[39m[38;2;210;3;170m_[39m[38;2;200;1;182m_[39m[38;2;189;1;193m_[39m[38;2;178;1;203m|[39m[38;2;166;3;213m_[39m[38;2;154;7;222m|[39m[38;2;141;11;230m [39m[38;2;129;17;237m|[39m[38;2;116;24;243m_[39m[38;2;103;32;248m_[39m[38;2;91;40;251m_[39m[38;2;79;50;253m|[39m[38;2;68;61;254m_[39m[38;2;57;72;254m|[39m[38;2;46;83;253m [39m[38;2;37;95;250m|[39m[38;2;29;108;246m_[39m[38;2;21;120;241m [39m[38;2;15;133;235m [39m[38;2;10;146;227m|[39m[38;2;5;158;219m[39m
  [38;2;254;57;71m [39m[38;2;253;47;83m [39m[38;2;250;38;95m [39m[38;2;246;29;107m [39m[38;2;241;22;120m [39m[38;2;235;15;132m [39m[38;2;228;10;145m [39m[38;2;219;6;158m [39m[38;2;210;3;170m [39m[38;2;200;1;182m [39m[38;2;189;1;193m [39m[38;2;178;1;203m [39m[38;2;166;3;213m [39m[38;2;154;7;222m [39m[38;2;141;11;230m [39m[38;2;129;17;237m [39m[38;2;116;24;243m [39m[38;2;103;32;248m [39m[38;2;91;40;251m [39m[38;2;79;50;253m [39m[38;2;68;61;254m [39m[38;2;57;72;254m [39m[38;2;46;83;253m [39m[38;2;37;95;250m [39m[38;2;29;108;246m|[39m[38;2;21;120;241m_[39m[38;2;15;133;235m_[39m[38;2;10;146;227m_[39m[38;2;5;158;219m|[39m[38;2;3;170;210m[39m
  [38;2;253;47;83m[39m
  `;
  console.log(string.trim());
}

yargs
  .config({})
  .middleware(() => logo())
  .command(
    ['list', 'ls'],
    'list all commits',
    {
      compact: {
        alias: 'c',
        description: 'show compact table',
        type: 'boolean',  
        default: true,
      },
      script: {
        description: 'list commit script',
        type: 'string',
        default: "git log --pretty=oneline --format='%H  %s  %cd  %an  %ae'",
      },
    },
    async (argv) => {
      try {
        await list(argv);
      } catch (error) {
        throw color(error.message, 'red');
      }
    }
  )
  .command(
    ['redate [subject] <value>', 'rd'],
    'rewrite commit dates',
    {
      script: {
        description: 'list commit script',
        type: 'string',
        default: 'git log --format=format:%H',
      },
    },
    async (argv) => {
      try {
        await redate(argv);
      } catch (error) {
        throw color(error.message, 'red');
      }
    }
  )
  .command(
    ['reauthor <value>', 'ra'],
    'rewrite author name',
    {
      script: {
        description: 'list commit script',
        type: 'string',
        default: 'git log --format=format:%H',
      },
    },
    async (argv) => {
      try {
        await reauthor(argv);
      } catch (error) {
        throw color(error.message, 'red');
      }
    }
  )
  .command(
    ['remail <value>', 're'],
    'rewrite author email',
    {
      script: {
        description: 'list commit script',
        type: 'string',
        default: 'git log --format=format:%H',
      },
    },
    async (argv) => {
      try {
        await remail(argv);
      } catch (error) {
        throw color(error.message, 'red');
      }
    }
  )
  .command(
    ['remsg <value>', 'rm'],
    'rewrite commit msg',
    {
      script: {
        description: 'list commit script',
        type: 'string',
        default: 'git log --format=format:%H',
      },
    },
    async (argv) => {
      try {
        await remsg(argv);
      } catch (error) {
        throw color(error.message, 'red');
      }
    }
  )
  .options('all', {
    alias: 'a',
    type: 'boolean',
    default: true,
    description: 'rewrite all commits',
  })
  .options('sha', {
    alias: 's',
    type: 'string',
    description: 'commit sha to rewrite',
  })
  .options('authorDate', {
    alias: 'd',
    type: 'boolean',
    default: true,
    description: 'change author date',
  })
  .options('committerDate', {
    alias: 'c',
    type: 'boolean',
    default: true,
    description: 'change committer date',
  })
  .demandCommand(1)
  .help()
  .wrap(90).argv;
