#!/usr/bin/env node

import {access} from 'node:fs/promises';
import {stdout} from 'node:process';
import {clearLine, moveCursor} from 'node:readline';
import {promisify} from 'node:util';

import debug from 'debug';
import meow from 'meow';
import ncu from 'npm-check-updates';
import pc from 'picocolors';

import {checkGit} from './check-git.js';
import {upgrade} from './upgrade.js';
import {getPackageManager, panic} from './utils.js';

const log = debug('ncu-git:index');
const pClearLine = promisify(clearLine);
const pMoveCursor = promisify(moveCursor);

const isYarn = async (): Promise<boolean> => {
	try {
		log('Accessing package-lock.json');
		await access('package-lock.json');
		log('package-lock.json exists');
		return false;
	} catch {
		log('package-lock.json does not exist');
	}

	try {
		log('Accessing yarn.lock');
		await access('yarn.lock');
		log('yarn.lock exists');
		return true;
	} catch {
		log('yarn.lock does not exist');
	}

	return false;
};

const parsedArgv = meow(
	`
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
	  --reset               Reset package.json and the lock-file when \`--run\` errors
`,
	{
		importMeta: import.meta,
		allowUnknownFlags: false,
		flags: {
			help: {
				alias: 'h',
				type: 'boolean',
			},
			run: {
				alias: 'r',
				type: 'string',
				isMultiple: true,
			},
			version: {
				alias: 'v',
				type: 'boolean',
			},
			packageManager: {
				alias: 'p',
				type: 'string',
			},
			reset: {
				type: 'boolean',
				default: true,
			},
			yolo: {
				type: 'boolean',
			},
		},
		booleanDefault: false,
	},
);

log(parsedArgv);

const {flags, input} = parsedArgv;

if (input.length === 0) {
	await ncu.run(
		{
			format: [],
		},
		{cli: true},
	);

	// It prints "Use ncu -u ..." on the last line
	// So clear previous line because this app isn't ncu
	await pMoveCursor(stdout, 0, -1);
	await pClearLine(stdout, 1);

	console.log('Use %s to upgrade all packages.', pc.blue('ncu-git "*"'));
} else {
	try {
		await access('package.json');
	} catch {
		panic('No package.json in current directory.');
	}

	const useYarn
		= flags.packageManager === 'yarn'
		|| (flags.packageManager !== 'npm' && (await isYarn()));

	log('useYarn === %s', useYarn);

	const packageManager = getPackageManager(useYarn);

	try {
		await checkGit(packageManager, flags.yolo ?? false);
	} catch (error: unknown) {
		if (error instanceof Error) {
			panic(error.message);
		}

		throw error;
	}

	for (const dependency of input) {
		await upgrade(dependency, packageManager, {
			run: flags.run ?? [],
			reset: flags.reset,
		});
	}
}
