import {fileURLToPath} from 'node:url';

import test from 'ava';

import {withTemporaryDir} from './helpers.js';

/*
	Yarn and npm require stdin: inherit (haven't figured out why)
	So set that
*/

const indexJs = fileURLToPath(new URL('../src/index.js', import.meta.url));

test(
	'No outdated dependencies',
	withTemporaryDir('yarn'),
	async (t, _cwd, _fs, execa) => {
		await execa('yarn', ['add', '-D', '@lusc/tsconfig']);
		await execa('git', ['commit', '-am', '"Add @lusc/tsconfig"']);

		await execa('node', [indexJs, '*'], {stdin: 'inherit'});

		const {stdout} = await execa('git', ['log', '--format=%s']);

		t.is(stdout, 'Add @lusc/tsconfig\nInit');
	},
);

test(
	'Outdated devDependency',
	withTemporaryDir('yarn'),
	async (t, _cwd, _fs, execa) => {
		await execa('yarn', ['add', '-D', '@lusc/tsconfig@1.0.0']);
		await execa('git', ['commit', '-am', '"Add @lusc/tsconfig"']);

		await execa('node', [indexJs, '*'], {stdin: 'inherit'});

		const {stdout} = await execa('git', ['--no-pager', 'log', '--format=%s']);
		t.regex(stdout, /^Bump @lusc\/tsconfig from 1\.0\.0 to \d+\.\d+\.\d+$/m);
	},
);

test(
	'Outdated dependency npm',
	withTemporaryDir('npm'),
	async (t, _cwd, _fs, execa) => {
		await execa('npm', ['i', '@lusc/tsconfig@1.0.0']);
		await execa('git', ['commit', '-am', '"Add @lusc/tsconfig"']);

		await execa('node', [indexJs, '*'], {stdin: 'inherit'});
		const {stdout} = await execa('git', ['--no-pager', 'log', '--format=%s']);
		t.regex(stdout, /^Bump @lusc\/tsconfig from 1\.0\.0 to \d+\.\d+\.\d+$/m);
	},
);

test(
	'Multiple dependencies',
	withTemporaryDir('yarn'),
	async (t, _cwd, fs, execa) => {
		console.log(_cwd);

		await execa('yarn', [
			'add',
			'@lusc/tsconfig@1.0.0',
			'@lusc/truth-table@1.0.0',
		]);

		console.log(
			await fs.readFile('package.json'),
			await fs.readFile('yarn.lock'),
		);

		const {stdout: diffStdout} = await execa('git', ['--no-pager', 'diff']);
		console.log(diffStdout);

		console.log('yarn done');

		const {stdout: ncuStdout} = await execa('yarn', ['ncu']);
		console.log(ncuStdout);

		await execa('git', [
			'commit',
			'-am',
			'"Add @lusc/tsconfig and @lusc/truth-table"',
		]);

		console.log('git done');

		await execa('node', [indexJs, '*'], {stdin: 'inherit'});
		console.log('node done');
		const {stdout} = await execa('git', ['--no-pager', 'log', '--format=%s']);
		t.regex(
			stdout,
			/^Bump @lusc\/truth-table from 1\.0\.0 to \d+\.\d+\.\d+ Bump @lusc\/tsconfig from 1\.0\.0 to \d+\.\d+\.\d+$/m,
		);
	},
);

test(
	'Multiple dependencies but not all',
	withTemporaryDir('yarn'),
	async (t, _cwd, _fs, execa) => {
		await execa('yarn', [
			'add',
			'@lusc/tsconfig@1.0.0',
			'@lusc/truth-table@1.0.0',
			'@lusc/sudoku@1.0.0',
		]);
		await execa('git', [
			'commit',
			'-am',
			'"Add @lusc/{tsconfig,truth-table,sudoku}"',
		]);

		await execa('node', [indexJs, '@lusc/tsconfig,@lusc/truth-table'], {
			stdin: 'inherit',
		});
		const {stdout} = await execa('git', ['--no-pager', 'log', '--format=%s']);
		t.regex(
			stdout,
			/^Bump @lusc\/truth-table from 1\.0\.0 to \d+\.\d+\.\d+ Bump @lusc\/tsconfig from 1\.0\.0 to \d+\.\d+\.\d+$/m,
		);
	},
);

test(
	'Command fails, reset',
	withTemporaryDir('yarn'),
	async (t, _cwd, fs, execa) => {
		await fs.writeFile('index.js', 'throw "uh-oh";');

		await execa('yarn', ['add', '@lusc/tsconfig@1.0.0']);
		await execa('git', ['add', '.']);
		await execa('git', ['commit', '-m', '"Add @lusc/tsconfig; Add script"']);

		await t.throwsAsync(
			async () => {
				await execa('node', [indexJs, '*', '-r', '"node index.js"'], {
					stdin: 'inherit',
				});
			},
			{
				message: /uh-oh/,
			},
		);

		const {stdout} = await execa('git', ['diff', '--name-only']);
		t.regex(stdout, /^\s*$/);
	},
);

test(
	'Command fails, no reset',
	withTemporaryDir('yarn'),
	async (t, _cwd, fs, execa) => {
		await fs.writeFile('index.js', 'throw "oh no";');

		await execa('yarn', ['add', '@lusc/tsconfig@1.0.0']);
		await execa('git', ['add', '.']);
		await execa('git', ['commit', '-m', '"Add @lusc/tsconfig"']);

		await t.throwsAsync(
			async () => {
				await execa(
					'node',
					[indexJs, '*', '--no-reset', '-r', '"node index.js"'],
					{
						stdin: 'inherit',
					},
				);
			},
			{
				message: /oh no/,
			},
		);

		const {stdout} = await execa('git', ['diff', '--name-only', '--staged']);
		t.regex(stdout, /^package\.json$\s^yarn\.lock$/m);
	},
);

test(
	'Command fails, no reset with yolo',
	withTemporaryDir('yarn'),
	async (t, _cwd, fs, execa) => {
		await fs.writeFile('index.js', 'throw "oh no";');

		await execa('yarn', ['add', '@lusc/tsconfig@1.0.0']);
		await execa('git', ['add', '.']);
		await execa('git', ['commit', '-m', '"Add @lusc/tsconfig"']);

		// Oh no it failed!
		await t.throwsAsync(
			async () => {
				await execa(
					'node',
					[indexJs, '*', '--no-reset', '-r', '"node index.js"'],
					{
						stdin: 'inherit',
					},
				);
			},
			{
				message: /oh no/,
			},
		);

		const {stdout: stdout1} = await execa('git', [
			'diff',
			'--name-only',
			'--staged',
		]);
		t.regex(stdout1, /^package\.json$\s^yarn\.lock$/m);

		// Let's fix the issue
		await fs.writeFile('index.js', '');
		await execa('git', ['add', 'index.js']);

		// Great! It works again
		await t.notThrowsAsync(async () => {
			await execa(
				'node',
				[indexJs, '*', '--no-reset', '-r', '"node index.js"', '--yolo'],
				{
					stdin: 'inherit',
				},
			);
		});

		const {stdout: stdout2} = await execa('git', ['status', '-s']);

		t.regex(stdout2, /^\s*$/);
	},
);
