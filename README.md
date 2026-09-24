<img src="./shellfies/logo.png" />

# restory 3.0

✅ one pass: every rewrite is a single `git-filter-repo` run, however many commits it touches.  
✅ `set`, `replace` and `shift` replace the old `remsg`, `reauthor`, `remail` and `redate` commands.  
✅ `grep` searches every field of every commit.  
✅ `--dry-run` shows the change before anything is rewritten.  
✅ `restory undo` restores the backup taken before each rewrite.  
✅ you choose whether `origin` stays or goes.  
✅ `--json` output and a typed programmatic API.  
✅ standalone: [`git-filter-repo`](https://github.com/newren/git-filter-repo) is bundled, so you only need `git` and `python3`.

> [!CAUTION]
> THIS WILL REWRITE YOUR GIT HISTORY!  
> EVERY REWRITTEN COMMIT (AND EVERY COMMIT AFTER IT) GETS A NEW SHA!  
> USE AT YOUR OWN RISK!

# install

```bash
npm install -g @tool3/restory
```

or

```bash
npx @tool3/restory <command> [args] [options]
```

things to know:

- you need `git` and `python3` (set `RESTORY_PYTHON` to use another interpreter).
- the working tree must be clean before a rewrite.
- **`origin` is removed after a rewrite by default**, since the new history no longer matches it. restory prints the url and the commands to reconnect and force push. pass `--keep-origin` (`-k`) to keep it.
- without a selection flag (`-s`, `-n`, `-r`, `-g`), a command applies to **every** commit reachable from `HEAD`.
- a backup bundle is written to `.git/restory/backups` before every rewrite. pass `--no-backup` to skip it.

# commands

| command                                         | alias | description                             |
| ----------------------------------------------- | ----- | --------------------------------------- |
| `list`                                          | `ls`  | list commits                            |
| `grep <pattern>`                                |       | search every commit field with a regex  |
| `set <field> <value> [...]`                     |       | set fields to a new value               |
| `replace <field> <pattern> <replacement> [...]` | `sub` | replace regex matches inside fields     |
| `shift back\|forward <amount>`                  |       | move commit dates back or forward       |
| `undo [id]`                                     |       | restore the backup from before a rewrite |

## fields

| field                                               | meaning                                        |
| --------------------------------------------------- | ---------------------------------------------- |
| `message` (`msg`)                                   | the full commit message                        |
| `name`                                              | `author.name` and `committer.name`             |
| `email`                                             | `author.email` and `committer.email`           |
| `date`                                              | `author.date` and `committer.date`             |
| `author.name` `author.email` `author.date`          | the author only                                |
| `committer.name` `committer.email` `committer.date` | the committer only                             |
| `sha`, `author`, `committer`                        | `grep` / `--in` only                           |

dates are shown and matched as ISO 8601 with their offset (`2021-01-23T10:00:00+02:00`).
a new date can be any format javascript parses (`2024-01-01`, `2024-01-01 10:00`, `2024-01-01T10:00:00+02:00`), `now`, or `@<epoch>`.

# options

## selection

| option            | alias | description                                          |
| ----------------- | ----- | ---------------------------------------------------- |
| `--sha`           | `-s`  | only these commits (one or more)                     |
| `--number`        | `-n`  | only the last N commits                              |
| `--range`         | `-r`  | only a range, `<from> <to>` or `"from..to"`          |
| `--all`           | `-a`  | walk every branch and tag, not just `HEAD`           |
| `--grep`          | `-g`  | only commits matching a pattern                      |
| `--in`            |       | fields the pattern searches (default: all)           |
| `--ignore-case`   | `-i`  | case-insensitive patterns                            |
| `--fixed-strings` | `-F`  | patterns are plain text, not regular expressions     |

## rewrite

| option          | alias | description                                | default |
| --------------- | ----- | ------------------------------------------ | ------- |
| `--dry-run`     | `-d`  | show what would change, rewrite nothing    | `false` |
| `--keep-origin` | `-k`  | keep the `origin` remote after rewriting   | `false` |
| `--backup`      |       | save a backup for `restory undo`           | `true`  |
| `--quiet`       | `-q`  | only print the summary                     | `false` |

## output

| option       | alias | description                  | default          |
| ------------ | ----- | ---------------------------- | ---------------- |
| `--json`     |       | print machine-readable JSON  | `false`          |
| `--logo`     | `-l`  | print the logo               | `true` in a tty  |
| `--ellipsis` | `-e`  | truncate `ls` columns        | `true`           |

# usage

## `ls`

```bash
restory ls
restory ls -n 5
restory ls -r c884ca6 0b4be21
```

## `grep`

every commit that mentions `moon` anywhere: sha, message, names, emails or dates.
each match shows the sha, the committer and the subject. matches in other fields are listed under it.

```bash
restory grep -i moon
```

only look in author emails, on every branch

```bash
restory grep '@old\.com$' --in author.email --all
```

commits dated 2021, among the last 50

```bash
restory grep ^2021 --in date -n 50
```

## `set`

> [!CAUTION]
> IMPERSONATION IS STRICTLY PROHIBITED!  
> ANY IMPERSONATION WILL BE YOUR RESPONSIBILITY!

reword one commit

```bash
restory set message 'fix: typo' -s 620a83b
```

rename the author and committer of the last 5 commits

```bash
restory set name 'Jebediah Kerman' -n 5
```

set several fields in one pass

```bash
restory set name 'Jebediah Kerman' email jeb@ksp.com date '2024-01-01 10:00' -s 620a83b
```

## `replace`

patterns are javascript regular expressions, replacements can use `$1` and `$&`.

```bash
restory replace message Moon Mun
restory replace email '@old\.com$' '@new.com'
restory replace message '^wip: ' '' -i
restory replace message '(\d+) rockets' '$1 boosters'
restory replace date ^2021 1984 -n 3
```

several replacements in one pass

```bash
restory replace message Moon Mun name ^tal Tal
```

## `shift`

```bash
restory shift back 2h -n 3
restory shift forward 1d12h --grep 'hotfix' --in message
restory shift back 1w --field author.date
```

units: `w` `d` `h` `m` `s`.

## preview, then undo

```bash
restory replace message Moon Mun --dry-run
restory replace message Moon Mun
restory undo
```

`restory undo --list` shows the saved backups, `restory undo <id>` restores a specific one.

# programmatic api

```ts
import { rewrite, grep, list, undo } from '@tool3/restory';

const result = await rewrite({
  edits: [
    { field: 'message', replace: /moon/i, with: 'Mun' },
    { field: 'author.name', set: 'Jebediah Kerman' },
    { field: 'date', shift: '-2h' },
  ],
  select: { last: 5 },
  keepOrigin: true,
  dryRun: false,
});

result.changes;       // [{ sha, subject, changes: [{ field, before, after }] }]
result.rewritten;     // { [oldSha]: newSha }
result.removedOrigin; // { url, branch } when origin was removed

const { matches } = await grep({ pattern: 'moon', ignoreCase: true, fields: ['message'] });
const commits = await list({ select: { range: 'v1.0..HEAD' } });
await undo();
```

set, replace and shift edits can be mixed in one `rewrite` call, and they all run in a single pass.

# migrating from 2.x

| 2.x                                    | 3.x                                           |
| -------------------------------------- | --------------------------------------------- |
| `restory remsg 'new message' -s abc`   | `restory set message 'new message' -s abc`    |
| `restory remsg Moon Mun`               | `restory replace message Moon Mun`            |
| `restory reauthor 'Jeb'`               | `restory set name 'Jeb'`                      |
| `restory remail 'jeb@ksp.com'`         | `restory set email jeb@ksp.com`               |
| `restory redate 2021 1984`             | `restory replace date 2021 1984`              |
| `restory rewrite -m a b -a t z`        | `restory replace message a b name t z`        |
| `--committer false`                    | use `author.*` fields                         |
| `--safe` (never worked)                | origin is removed by default, `-k` keeps it   |
| `--git-filter-repo false`              | removed, filter-repo is always used           |
