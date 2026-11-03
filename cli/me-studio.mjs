#!/usr/bin/env node
import { run } from './runner.mjs';

process.exitCode = await run(process.argv.slice(2));
