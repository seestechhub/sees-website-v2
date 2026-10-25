import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
async function run(script, args, cwd = root) {
  const child = spawn(process.execPath, [resolve(root, script), ...args], { cwd, stdio: 'inherit', env: process.env });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  if (code !== 0) process.exit(code || 1);
}
const tsc = 'node_modules/typescript/bin/tsc';
switch (process.argv[2]) {
  case 'typecheck':
    await run(tsc, ['--noEmit', '-p', 'apps/api/tsconfig.json']);
    await run(tsc, ['--noEmit', '-p', 'apps/web/tsconfig.json']);
    break;
  case 'build':
    await run(tsc, ['-p', 'apps/api/tsconfig.json']);
    await run('node_modules/next/dist/bin/next', ['build', '--webpack'], resolve(root, 'apps/web'));
    break;
  case 'test':
    await run('node_modules/tsx/dist/cli.mjs', ['--test', 'apps/api/test/integration.test.ts']);
    break;
  default: throw new Error('Choose build, typecheck or test.');
}
