import type {Debugger} from 'debug';
import type {ExecaChildProcess} from 'execa';

export const debugExeca = (
	execaResult: ExecaChildProcess,
	log: Debugger,
): ExecaChildProcess => {
	// Don't chain (result.catch().then())
	// or result.then(() => {}, () => {})
	// Because .catch on its own has types for Typescript
	void execaResult.catch(error => {
		log('Error: $ %s', error.escapedCommand);
		log('Stdout: %s\n', error.stdout);
		log('Stderr: %s\n', error.stderr);
	});
	execaResult.then(
		r => {
			log('$ %s', r.escapedCommand);
			log('Stdout: %s\n', r.stdout);
		},
		() => {
			/* No unhandled rejection */
		},
	);

	return execaResult;
};
