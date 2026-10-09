import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = await mkdtemp(join(tmpdir(), 'astrorao-tests-'));
try {
	const bundle = await build({
		entryPoints: ['tests/observing.test.ts'],
		bundle: true,
		platform: 'node',
		format: 'esm',
		write: false
	});
	const file = join(directory, 'observing.test.mjs');
	await writeFile(file, bundle.outputFiles[0].text);
	const result = spawnSync(process.execPath, ['--test', file], { stdio: 'inherit' });
	process.exitCode = result.status ?? 1;
} finally {
	await rm(directory, { recursive: true, force: true });
}
