import {execa, execaCommand} from 'execa';
import ncu from 'npm-check-updates';
import minVersion from 'semver/ranges/min-version.js';

import {Diff, getDiff} from './diff.js';
import {getLockFile} from './utils.js';

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

	await execa('git', ['commit', '-m', formatted.join('\n')], {
		stdio: 'inherit',
	});
};

const runCommand = async (
	command: string,
	reset: boolean,
	lockFile: string,
): Promise<void> => {
	try {
		await execaCommand(command, {stdio: 'inherit', shell: true});
	} catch (error: unknown) {
		console.error('An error occured running `%s`', command);

		if (reset) {
			await execa('git', ['reset', '-q', 'HEAD', '--', '.']);
			await execa('git', ['checkout', 'HEAD', '--', 'package.json', lockFile]);
		}

		throw error;
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
		filter: dependency,
		upgrade: true,
	});

	const diff = await getDiff();

	if (diff.length === 0) {
		return;
	}

	await execa(useYarn ? 'yarn' : 'npm', ['install'], {stdio: 'inherit'});

	const lockFile = getLockFile(useYarn);
	await execa('git', ['add', lockFile, 'package.json'], {stdio: 'inherit'});

	for (const command of flags.run) {
		await runCommand(command, flags.reset, lockFile);
	}

	await commit(diff);
};
