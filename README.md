# restory
rewrite git history

# install
```bash
yarn add @tool3/restory
```

# api
## `ls`
show all commits

### example
```bash
restory ls
```

output:
![](./list.png)

## `redate`
rewrite commit|s date   
### usage
```bash
restory redate <string-to-replace> <value>
```
### examples
- rewrite all commits that has `2021` to year to `1987`   
```bash
restory redate 2021 1987
```
> NOTE: this will also automagically update the day and month

- rewrites a specific commit's day

```bash
restory redate 'Sat Jan 23' 'Sun Jan 24' -s '620a83bdc1e58aa9c487ec1a1d1496b25d6d29aa'
```

## `reauthor`
rewrite commit|s author name

### usage
```bash
restory reauthor <author-name>
```
### example
rewrite all commit author names to The Devil
```bash
restory reauthor 'The Devil'
```

## `remail`
rewrite commit|s author email

### usage
```bash
restory remail <author-email>
```

### example
rewrite all commit author email to 'thedevil@666.com'
```bash
restory remail 'thedevil@666.com'
```

# important usage notes
⚠️ ATTENTION! THIS WILL REWRITE YOUR GIT HISTORY! ⚠️    
use at your own risk

things to know:
- every `restory` command recreates the commit|s shas
- rewriting history takes a while! I added a spinner and what commit it's currently processing but still it takes time, let it run, and validate the results with `restory ls` when it's done.
- you will have to force push
