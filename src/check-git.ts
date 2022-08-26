import debug from 'debug';
import {execa, type ExecaChildProcess, type Options} from 'execa';

import {debugExeca} from './debug-execa.js';
import type {PackageManager} from './utils.js';

const log = debug('ncu-git:check-git');

export const checkGit = async (
	{lockfile}: PackageManager,
	yolo: boolean,
	options?: Options,
): Promise<void> => {
	const execa_ = (
		filename: string,
		args: readonly string[] = [],
	): ExecaChildProcess => debugExeca(execa(filename, args, options), log);

	const expectEmptyStdout = async (
		file: string,
		args: readonly string[],
		message: string,
	): Promise<void> => {
		const {stdout} = await execa_(file, args);

		if (stdout.trim() !== '') {
			throw new Error(message);
		}
	};

	try {
		await execa_('git', ['--version']);
	} catch {
		throw new Error('git was not found in path');
	}

	try {
		await execa_('git', ['status']);
	} catch {
		throw new Error('Current working directory is not a git repository.');
	}

	if (yolo) {
		return;
	}

	await expectEmptyStdout(
		'git',
		['diff', '--name-only', '--', 'package.json'],
		'Expected "package.json" to be unmodified.',
	);

	await expectEmptyStdout(
		'git',
		['diff', '--name-only', '--', lockfile],
		`Expected "${lockfile}" to be unmodified.`,
	);

	await expectEmptyStdout(
		'git',
		['diff', '--staged'],
		'Expected staging area to be empty.',
	);
};
