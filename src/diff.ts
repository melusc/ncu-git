import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

import {execa} from 'execa';

export type Diff = readonly [
	packageName: string,
	oldVersion: string,
	newVersion: string,
];

const dependencyProperties = [
	'devDependencies',
	'optionalDependencies',
	'peerDependencies',
	'dependencies',
] as const;
type DependencyProperties = (typeof dependencyProperties)[number];

type DependencyEntry = Record<string, string>;
type PackageJson = {
	[key in DependencyProperties]?: DependencyEntry;
};

const assertObject: (
	item: unknown,
) => asserts item is Record<string, unknown> = (
	item: unknown,
): asserts item is Record<string, unknown> => {
	assert.equal(typeof item, 'object');
	assert(!Array.isArray(item));
	assert.notEqual(item, null);
};

export const getDiff = async (): Promise<readonly Diff[]> => {
	const {stdout: oldPackageJsonRaw} = await execa('git', [
		'show',
		'HEAD:package.json',
	]);
	const oldPackageJson = JSON.parse(oldPackageJsonRaw) as unknown;
	assertObject(oldPackageJson);

	const newPackageJsonRaw = await readFile('package.json', 'utf8');
	const newPackageJson = JSON.parse(newPackageJsonRaw) as unknown;
	assertObject(newPackageJson);

	const diff: Diff[] = [];

	for (const key of dependencyProperties) {
		if (!Object.hasOwn(newPackageJson, key)) {
			continue;
		}

		const dependencyItem = newPackageJson[key];
		if (dependencyItem === undefined) {
			continue;
		}

		assertObject(dependencyItem);

		for (const [name, newVersion] of Object.entries(dependencyItem) as Array<
			[string, string]
		>) {
			const oldVersion = (oldPackageJson as PackageJson)[key]?.[name];
			assert(oldVersion !== undefined);
			if (oldVersion !== newVersion) {
				diff.push([name, oldVersion, newVersion]);
			}
		}
	}

	return diff;
};
