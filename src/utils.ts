import {exit} from 'node:process';

import pc from 'picocolors';

export const panic = (m: string): void => {
	console.error(pc.red(m));
	exit(1);
};

export type PackageManager = {
	readonly lockfile: 'yarn.lock' | 'package-lock.json';
	readonly packageManagerFile: 'yarn' | 'npm';
};

export const getPackageManager = (useYarn: boolean): PackageManager =>
	useYarn
		? {
				lockfile: 'yarn.lock',
				packageManagerFile: 'yarn',
		  }
		: {
				lockfile: 'package-lock.json',
				packageManagerFile: 'npm',
		  };
