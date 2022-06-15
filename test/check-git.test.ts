import test from 'ava';

import {checkGit} from '../src/check-git.js';

import {withTemporaryDir} from './helpers.js';

test('Everything okay yarn', withTemporaryDir('yarn'), async (t, cwd) => {
	await checkGit(true, false, {cwd});

	t.pass();
});

test('Everything okay npm', withTemporaryDir('npm'), async (t, cwd) => {
	await checkGit(false, false, {cwd});

	t.pass();
});

test(
	'Has staged files',
	withTemporaryDir('yarn'),
	async (t, cwd, {writeFile}, execa) => {
		await writeFile('index.ts', 'console.log(":)");');
		await execa('git', ['add', 'index.ts']);

		await t.throwsAsync(
			async () => {
				await checkGit(true, false, {cwd});
			},
			{
				message: 'Expected staging area to be empty.',
			},
		);
	},
);

test(
	'Has modified yarn.lock',
	withTemporaryDir('yarn'),
	async (t, cwd, {writeFile}) => {
		await writeFile('yarn.lock', 'Modified!');

		await t.throwsAsync(
			async () => {
				await checkGit(true, false, {cwd});
			},
			{
				message: 'Expected "yarn.lock" to be unmodified.',
			},
		);
	},
);

test(
	'Has modified package-lock.json',
	withTemporaryDir('npm'),
	async (t, cwd, {writeFile}) => {
		await writeFile('package-lock.json', '{"modified": true}');

		await t.throwsAsync(
			async () => {
				await checkGit(false, false, {cwd});
			},
			{
				message: 'Expected "package-lock.json" to be unmodified.',
			},
		);
	},
);

test(
	'Has modified package.json',
	withTemporaryDir('yarn'),
	async (t, cwd, {writeFile}) => {
		await writeFile('package.json', '{"modified": "Yeah"}');

		await t.throwsAsync(
			async () => {
				await checkGit(true, false, {cwd});
			},
			{
				message: 'Expected "package.json" to be unmodified.',
			},
		);
	},
);

test('Yolo', withTemporaryDir('yarn'), async (t, cwd, {writeFile}, execa) => {
	await writeFile('package.json', '{"modified": true}');
	await writeFile('yarn.lock', 'Modified :(');
	await writeFile('index.ts', 'console.log();');
	await execa('git', ['add', 'index.ts']);

	await t.notThrowsAsync(async () => {
		await checkGit(true, true, {cwd});
	});
});

test('Not a git repository', withTemporaryDir('yarn'), async (t, cwd, {rm}) => {
	await rm('.git', {recursive: true});

	await t.throwsAsync(
		async () => {
			await checkGit(true, false, {cwd});
		},
		{
			message: 'Current working directory is not a git repository.',
		},
	);
});
