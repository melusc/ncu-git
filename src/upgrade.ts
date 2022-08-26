import debug from 'debug';
import {execa, execaCommand} from 'execa';
import ncu from 'npm-check-updates';
import minVersion from 'semver/ranges/min-version.js';

import {debugExeca} from './debug-execa.js';
import {type Diff, getDiff} from './diff.js';
import {type PackageManager, panic} from './utils.js';

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
	{lockfile, packageManagerFile}: PackageManager,
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
				execa('git', ['checkout', 'HEAD', '--', 'package.json', lockfile]),
				log,
			);
			await debugExeca(execa(packageManagerFile, ['install']), log);
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
	packageManager: PackageManager,
	flags: {
		run: string[];
		reset: boolean;
	},
): Promise<void> => {
	const {packageManagerFile, lockfile} = packageManager;

	await ncu.run({
		// "*" should match all dependencies
		// but because it's a glob it wouldn't match slashes (e.g. @lusc/tsconfig)
		filter: dependency === '*' ? undefined : dependency,
		upgrade: true,
		packageManager: packageManagerFile,
	});

	const diff = await getDiff();
	log('Diff %o', diff);

	if (diff.length === 0) {
		return;
	}

	await debugExeca(
		execa(packageManagerFile, ['install'], {stdio: 'inherit'}),
		log,
	);

	await debugExeca(
		execa('git', ['add', lockfile, 'package.json'], {stdio: 'inherit'}),
		log,
	);

	for (const command of flags.run) {
		await runCommand(command, flags.reset, packageManager);
	}

	await commit(diff);
};
