<img src="./restory.svg" width=100 />   

# restory 

re~~write git his~~tory

# install
```bash
yarn add @tool3/restory -g
```
or 
```bash
npx @tool3/restory <cmd> [args] [options]
```

# features
`restory` uses it's own dist of [`git-filter-repo`](https://github.com/newren/git-filter-repo)   
and therefore doesn't rely on you having it.
- super fast
- simple api
- standalone

# api
every command in `restory` can either set a new value or replace an existing value.   
`restory <cmd> [optional-subject-to-replace] <value>`

## `list`
list all commits   
alias `ls`   
## `redate`
rewrite commit|s date   
alias `rd`   
## `reauthor`
rewrite commit|s author name   
alias `ra`
## `remail`
rewrite commit|s author email   
alias `re`
## `remsg`
rewrite commit|s message   
alias `rm`   
## `rewrite`
rewrite multiple commit fields   
this command is a combination of all of the commands above, and is controlled with flags   
alias `rm`   
# options
### `sha`
type: `string`   
alias: `s`   
description: rewrite a specific commit sha.    
usage: `restory <cmd> [args] -s <short-sha>`
### `range`
type: `array`   
alias: `r`      
description: range of commits to operate on.    
usage: `restory <cmd> [args] -r <start-sha> <end-sha>`
### `number`
type: `number`   
alias: `n`      
description: number of commits.
default: 0 (all commits)    
usage: `restory <cmd> [args] -n <number>`
### `committer`
type: `boolean`   
alias: `c`      
description: include committer fields. for example: `author_date` will also include `committer_date` in the rewrite.   
default: `true`
### `git-filter-repo`
type: `boolean`   
alias: `g`      
description: use [`git filter-repo`](https://github.com/newren/git-filter-repo) insteads of `git filter-branch` - this method is extremely fast compared to filter-branch.   
default: `true`

# important usage notes
⚠️ ATTENTION! THIS WILL REWRITE YOUR GIT HISTORY! ⚠️    
⚠️ THIS OPERATION CANNOT BE REVERTED! ⚠️    
⚠️ USE AT YOUR OWN RISK ⚠️

things to know:
- this version of `git-filter-repo` does **NOT** remove `origin` when done rewriting.
- every `restory` command recreates the commit|s shas.
- you need to have a clean working directory.
- you will have to force push if using the same `origin`.
- when run without commit filter flag (`-s` || `-n` || `-r` - see [options](#options)) - the command will rewrite **ALL** commits with given input.

# examples
## `ls`
list all commits
```bash
restory ls
```
![](./ls.png)   
[![](https://img.shields.io/static/v1?label=created%20with%20shellfie&message=📸&color=pink)](https://github.com/tool3/shellfie)

list last 5 commits
```bash
restory ls -n 5
```

list range of commits
```bash
restory ls -r 'c884ca6' '0b4be21'
```

## `redate`
rewrite all commits that has `2021` to year to `1987`   
```bash
restory redate 2021 1987
```
> NOTE: this will also automagically update the day and month

rewrites a specific commit's day
```bash
restory redate 'Jan 23' 'Jan 24' -s '0b4be21'
```
rewrites the last 5 commits date to now
```bash
restory redate "$(echo `date`)" -n 5
```
## `reauthor`
rewrite all commit author names to `The Devil`
```bash
restory reauthor 'The Devil'
```
rewrite last 5 commits author to `Jebediah Kerman`
```bash
restory reauthor 'Jebediah Kerman' -n 5
```
## `remail`
rewrite all commit author and committer email to `thedevil@666.com`
```bash
restory remail 'thedevil@666.com'
```
## `remsg`
rewrite specific commit message
```bash
restory remsg 'this is the new commit msg' -s '620a83b'
```
rewrite `Moon` to `Mun` in all commit messages 
```bash
restory remsg 'Moon' 'Mun'
```

## `rewrite`
rewrite commit message and replace date year `1987` to `1988` for the last 3 commits
```bash
restory rewrite -m 'this is the new commit msg' -d '1987' '1988' -n 3
```
rewrite `Moon` to `Mun` in all commit messages 
```bash
restory rewrite -m 'Moon' 'Mun'
```

rewrite commit message, replace `t` to `z` in author name and set email to `new_value@world.com` in a range of commits
```bash
restory rewrite -m 'new message' -a 't' 'z' -e 'new_value@world.com' -r '8381e6a' '4110655'
```
