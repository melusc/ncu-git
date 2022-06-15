import {exit} from 'node:process';

const red = (s: string): string => `\u001B[91m${s}\u{001B}[0m`;
export const panic = (m: string): void => {
	console.error(red(m));
	exit(1);
};

export const getLockFile = (useYarn: boolean): string =>
	useYarn ? 'yarn.lock' : 'package-lock.json';
