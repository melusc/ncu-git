import {execa, Options} from 'execa';

import {getLockFile} from './utils.js';

export const checkGit = async (
	useYarn: boolean,
	yolo: boolean,
	options?: Options,
): Promise<void> => {
	const expectEmptyStdout = async (
		file: string,
		args: readonly string[],
		message: string,
	): Promise<void> => {
		const {stdout} = await execa(file, args, options);

		if (stdout.trim() !== '') {
			throw new Error(message);
		}
	};

	try {
		await execa('git', ['--version'], options);
	} catch {
		throw new Error('git was not found in path');
	}

	try {
		await execa('git', ['status'], options);
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

	const lockFile = getLockFile(useYarn);
	await expectEmptyStdout(
		'git',
		['diff', '--name-only', '--', lockFile],
		`Expected "${lockFile}" to be unmodified.`,
	);

	await expectEmptyStdout(
		'git',
		['diff', '--staged'],
		'Expected staging area to be empty.',
	);
};
