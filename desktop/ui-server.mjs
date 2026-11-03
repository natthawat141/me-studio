import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = process.argv[2];
const require = createRequire(join(directory, 'package.json'));
process.env.NODE_ENV = 'production';
const { config } = JSON.parse(await readFile(join(directory, '.next/required-server-files.json'), 'utf8'));
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
const { startServer } = require('next/dist/server/lib/start-server');
await startServer({ dir: directory, isDev: false, hostname: '127.0.0.1', port: 18147, allowRetry: false });
process.send?.({ kind: 'ready', nonce: process.env.STUDIO_BOOT_NONCE });
