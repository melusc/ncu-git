import {exit} from 'node:process';

const styleWithCode
	= (code: number) =>
	(s: string): string =>
		`\u001B[${code}m${s}\u001B[0m`;
export const red = styleWithCode(91);
export const blue = styleWithCode(94);
export const panic = (m: string): void => {
	console.error(red(m));
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
