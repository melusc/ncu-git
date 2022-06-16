# ncu-git

`@lusc/ncu-git` is a local equivalent of Dependabot, using [npm-check-updates](https://github.com/raineorshine/npm-check-updates) and commit changes automatically.

```sh
$ yarn list --pattern react
react@17.0.0

$ ncu-git react

$ yarn list --pattern react
react@18.2.0 # react@latest
$ git log -n 1 --format=%s
Bump react from 17.0.0 to 18.2.0
```

## Why

- For repositories not on GitHub or without Dependabot
- For repositories without GitHub Actions catching breaking changes

## Install

```sh
npm i -g @lusc/ncu-git
```

## Usage

```none
$ ncu-git --help

  Usage
    $ ncugit <packages>
    $ ncugit react react-dom
      => Will upgrade react then react-dom
         in two seperate commits
    $ ncugit react*
      => Will upgrade react and react-dom in one step
    $ ncugit react -r "yarn run throw"
      => Will not commit changes because a command threw

  Options
    --run, -r             A command to run after install, before commit
                          Use this to test assert nothing breaks
                          Multiple commands possible, run in the order received
    --packageManager, -p  Use yarn or npm (default npm)
    --help, -h            Show this and exit
    --version, -v         Show version and exit
    --yolo                Ignore modified package.json or lock-file
                          Ignore non-empty staging area
    --reset               Reset package.json and the lock-file when `--run` errors
```

## Example

package.json:

```json
{
  "dependencies": {
    "react": "17.0.0"
  }
}
```

index.js:

```js
throw 'Error';
```

By default package.json and the lock-file are reset.

```sh
$ ncu-git react -r "node index.js"
Command failed with exit code 1: node index.js

$ cat package.json
{
  "dependencies": {
    "react": "17.0.0"
  }
}
```

To prevent resetting those files use `--no-reset`.

```sh
$ ncu-git react -r "node index.js" --no-reset
Command failed with exit code 1: node index.js

# It wasn't reset and is still staged
$ cat package.json
{
  "dependencies": {
    "react": "18.2.0"
  }
}

# Fix the errors from upgrading
$ echo "console.log('All good')" > index.js
$ git add index.js

# --yolo to ignore that package.json and the lock-file are modified (because they weren't reset)
$ ncu-git react -r "node index.js" --yolo

$ git diff HEAD^..HEAD --name-only
package.json
yarn.lock # or package-lock.json
index.js
```
