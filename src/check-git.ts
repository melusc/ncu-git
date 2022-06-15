import {execa} from 'execa';

import {getLockFile, panic} from './utils.js';

const expectEmptyStdout = async (
	file: string,
	args: readonly string[],
	message: string,
): Promise<void> => {
	const {stdout} = await execa(file, args);

	if (stdout.trim() !== '') {
		panic(message);
	}
};

export const checkGit = async (
	useYarn: boolean,
	yolo: boolean,
): Promise<void> => {
	try {
		await execa('git', ['--version']);
	} catch {
		panic('git was not found in path');
	}

	try {
		await execa('git', ['status']);
	} catch {
		panic('Current working directory is not a git repository.');
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
		'Expected staging area to be empty',
	);
};
