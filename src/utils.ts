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

export const getLockFile = (useYarn: boolean): string =>
	useYarn ? 'yarn.lock' : 'package-lock.json';
