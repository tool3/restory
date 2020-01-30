#!/usr/bin/env node

const yargs = require('yargs');
const { color, logo } = require('./utils');
const { list } = require('./commands/list');
const redate = require('./commands/redate');
const reauthor = require('./commands/reauthor');
const remail = require('./commands/remail');
const remsg = require('./commands/remsg');

yargs
  .config({})
  .usage(`${logo()}restory <command> [args] [options]`)
  .middleware(() => console.log(logo().trimEnd()))
  .updateStrings({ 'Commands:': '\x1b[97m commands\x1b[0m' })
  .updateStrings({ 'Options:': '\x1b[97m options\x1b[0m' })
  .middleware((argv) => {
    if (argv.number) {
      argv.script = `${argv.script} -n ${argv.number}`;
    }

    if (argv.range) {
      argv.script = `${argv.script} ${argv.range.join('..')}`;
    }

    if (argv.subject) {
      const value = argv.value;
      argv.value = argv.subject;
      argv.subject = value;
    }
  })
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
        default: `git log --pretty=oneline --format='%h  %s  %cd  %an  %ae'`,
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
        default: 'git log --format=format:%h',
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
    ['reauthor [subject] <value>', 'ra'],
    'rewrite author name',
    {
      script: {
        description: 'list commit script',
        type: 'string',
        default: 'git log --format=format:%h',
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
    ['remail [subject] <value>', 're'],
    'rewrite author email',
    {
      script: {
        description: 'list commit script',
        type: 'string',
        default: 'git log --format=format:%h',
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
    ['remsg [subject]  <value>', 'rm'],
    'rewrite commit msg',
    {
      script: {
        description: 'list commit script',
        type: 'string',
        default: 'git log --format=format:%h',
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
  .options('sha', {
    alias: 's',
    type: 'string',
    description: 'commit sha to rewrite',
  })
  .options('range', {
    alias: 'r',
    type: 'array',
    description: 'commit sha range',
  })
  .options('number', {
    alias: 'n',
    type: 'number',
    default: 0,
    description: 'number of commits (0: all)',
  })
  .options('committer', {
    alias: 'c',
    type: 'boolean',
    default: true,
    description: 'include committer fields (e.g committer_date)',
  })
  .options('git-filter-repo', {
    alias: 'g',
    type: 'boolean',
    default: true,
    description: 'use git filter-repo instead of filter-branch',
  })
  .demandCommand(1)
  .help()
  .wrap(100).argv;
