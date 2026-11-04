import {test} from 'node:test';import assert from 'node:assert/strict';
import {fileOperationError} from '../desktop/policy.mjs';
test('desktop file IPC preserves safe timeout codes without forwarding raw provider errors',()=>{
 assert.equal(fileOperationError(Error('DESKTOP_REQUEST_TIMEOUT')),'DESKTOP_REQUEST_TIMEOUT');
 assert.equal(fileOperationError(Error('DESKTOP_WORKER_EXITED')),'DESKTOP_WORKER_EXITED');
 assert.equal(fileOperationError(Error('raw secret upstream body')),'FILE_READ_FAILED');
});
