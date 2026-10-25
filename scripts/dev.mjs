import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../', import.meta.url));
const children=[spawn(process.execPath,[root+'node_modules/tsx/dist/cli.mjs','watch','src/server.ts'],{cwd:root+'apps/api',stdio:'inherit'}),spawn(process.execPath,[root+'node_modules/next/dist/bin/next','dev','--webpack','--port','3108'],{cwd:root+'apps/web',stdio:'inherit'})];
for(const c of children)c.on('exit',()=>children.forEach(x=>x.kill()));
process.on('SIGINT',()=>children.forEach(x=>x.kill()));

