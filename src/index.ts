import {access} from 'node:fs/promises';
import {exit} from 'node:process';

import meow from 'meow';
import ncu from 'npm-check-updates';

import {checkGit} from './check-git.js';
import {upgrade} from './upgrade.js';
import {panic} from './utils.js';

const isYarn = async (): Promise<boolean> => {
	try {
		await access('package-lock.json');
		return false;
	} catch {}

	try {
		await access('yarn.lock');
		return true;
	} catch {}

	return false;
};

const {flags, input} = meow(
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

if (input.length === 0) {
	await ncu.run({}, {cli: true});
	exit(0);
}

try {
	await access('package.json');
} catch {
	panic('No package.json in current directory.');
}

const useYarn
	= flags.packageManager === 'yarn'
	|| (flags.packageManager !== 'npm' && (await isYarn()));

await checkGit(useYarn, flags.yolo ?? false);

for (const dependency of input) {
	await upgrade(dependency, useYarn, {
		run: flags.run ?? [],
		reset: flags.reset,
	});
}
