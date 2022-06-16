import {execa, execaCommand} from 'execa';
import ncu from 'npm-check-updates';
import minVersion from 'semver/ranges/min-version.js';
import debug from 'debug';

import {Diff, getDiff} from './diff.js';
import {getLockFile, panic} from './utils.js';
import {debugExeca} from './debug-execa.js';

const log = debug('ncu-git:upgrade');

const commit = async (diff: readonly Diff[]): Promise<void> => {
	const formatted = diff.map(([name, oldVersion, newVersion]): string => {
		const cleanOld = minVersion(oldVersion);
		const cleanNew = minVersion(newVersion);
		if (cleanOld === null) {
			throw new Error(`Could not parse ${oldVersion}`);
		}

		if (cleanNew === null) {
			throw new Error(`Could not parse ${newVersion}`);
		}

		return `Bump ${name} from ${cleanOld.version} to ${cleanNew.version}`;
	});

	await debugExeca(
		execa('git', ['commit', '-m', formatted.join('\n')], {
			stdio: 'inherit',
		}),
		log,
	);
};

const runCommand = async (
	command: string,
	reset: boolean,
	lockFile: string,
): Promise<void> => {
	try {
		await debugExeca(
			execaCommand(command, {stdio: 'inherit', shell: true}),
			log,
		);
	} catch (error: unknown) {
		console.error('An error occured running `%s`', command);

		if (reset) {
			log('Resetting');
			await debugExeca(execa('git', ['reset', '-q', 'HEAD', '--', '.']), log);
			await debugExeca(
				execa('git', ['checkout', 'HEAD', '--', 'package.json', lockFile]),
				log,
			);
		}

		if (error instanceof Error) {
			panic(error.message);
		} else {
			throw error;
		}
	}
};

export const upgrade = async (
	dependency: string,
	useYarn: boolean,
	flags: {
		run: string[];
		reset: boolean;
	},
): Promise<void> => {
	await ncu.run({
		// "*" should match all dependencies
		// but because it's a glob it wouldn't match slashes (e.g. @lusc/tsconfig)
		filter: dependency === '*' ? undefined : dependency,
		upgrade: true,
		packageManager: useYarn ? 'yarn' : 'npm',
	});

	const diff = await getDiff();
	log('Diff %o', diff);

	if (diff.length === 0) {
		return;
	}

	await debugExeca(
		execa(useYarn ? 'yarn' : 'npm', ['install'], {stdio: 'inherit'}),
		log,
	);

	const lockFile = getLockFile(useYarn);

	await debugExeca(
		execa('git', ['add', lockFile, 'package.json'], {stdio: 'inherit'}),
		log,
	);

	for (const command of flags.run) {
		await runCommand(command, flags.reset, lockFile);
	}

	await commit(diff);
};
