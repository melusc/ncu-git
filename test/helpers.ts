import {mkdtemp, writeFile, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

import test, {ExecutionContext, Macro} from 'ava';
import {execa, ExecaChildProcess, Options} from 'execa';

type Execa = (
	filename: string,
	args?: readonly string[],
	options?: Options,
) => ExecaChildProcess;

type Fs = {
	writeFile(path: string, content: string): Promise<void>;
	readFile(path: string): Promise<string>;
	rm(path: string, options: {recursive: boolean}): Promise<void>;
};

type Cb = (
	t: ExecutionContext,
	cwd: URL,
	fs: Fs,
	execa: Execa,
) => Promise<void>;

export const withTemporaryDir = (packageManager: 'npm' | 'yarn'): Macro<[Cb]> =>
	test.macro<[Cb]>(async (t, run) => {
		const temporaryDir = pathToFileURL(
			`${await mkdtemp(join(tmpdir(), 'ncu-git-'))}/`,
		);

		const cwdExeca: Execa = (filename, args, options = {}) => {
			// @ts-expect-error cwd is readonly
			options.cwd = temporaryDir;
			// @ts-expect-error shell is readonly
			options.shell = true;

			return execa(filename, args, options);
		};

		const cwdFs: Fs = {
			async writeFile(path, content) {
				return writeFile(new URL(path, temporaryDir), content, 'utf8');
			},
			async readFile(path) {
				return readFile(new URL(path, temporaryDir), 'utf8');
			},
			async rm(path, options) {
				return rm(new URL(path, temporaryDir), options);
			},
		};

		await cwdExeca('git', ['init']);
		// Don't sign (and potentially ask for password for gpg)
		await cwdExeca('git', ['config', 'commit.gpgsign', 'false']);

		await cwdExeca('git', ['config', 'user.email', 'email@example.org']);
		await cwdExeca('git', ['config', 'user.name', 'First Last']);

		await cwdFs.writeFile('package.json', '{}');
		await cwdFs.writeFile('.gitignore', 'node_modules\n');
		await cwdExeca(packageManager, ['install']);
		await cwdExeca('git', ['add', '.']);
		await cwdExeca('git', ['commit', '-m', 'Init']);

		try {
			await run(t, temporaryDir, cwdFs, cwdExeca);
		} finally {
			await rm(temporaryDir, {
				recursive: true,
			});
		}
	});
