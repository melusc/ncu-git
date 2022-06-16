import type debug from 'debug';
import {ExecaChildProcess} from 'execa';

export const debugExeca = (
	execaResult: ExecaChildProcess,
	log: debug.Debugger,
): ExecaChildProcess => {
	// Don't chain (result.catch().then())
	// or result.then(() => {}, () => {})
	// Because .catch on its own has types for Typescript
	void execaResult.catch(error => {
		log('Error: $ %s', error.escapedCommand);
		log(error.stdout);
		log(error.stderr);
	});
	execaResult.then(
		r => {
			log('$ %s', r.escapedCommand);
			log(r.stdout);
		},
		() => {
			/* No unhandled rejection */
		},
	);

	return execaResult;
};
