#!/usr/bin/env node

const yargs = require('yargs');
const { color } = require('./utils');
const { list } = require('./commands/list');
const redate = require('./commands/redate');
const reauthor = require('./commands/reauthor');
const remail = require('./commands/remail');

function logo() {
  const string = `
             _               
 ___ ___ ___| |_ ___ ___ _ _ 
|  _| -_|_ -|  _| . |  _| | |
|_| |___|___|_| |___|_| |_  |
                        |___|
  `;
  console.log(string);
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
    ['redate <subject> <value>', 'rd'],
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
  .options('all', {
    alias: 'a',
    type: 'boolean',
    default: false,
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
