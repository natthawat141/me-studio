import {test} from 'node:test';import assert from 'node:assert/strict';import {reduceActivity} from '../src/lib/production-activity';
test('activity ignores late terminal updates, validates paths and bounds history',()=>{
 let rows=reduceActivity([],{operationId:'a',action:'write',status:'started',relativePath:'scene.html'});
 rows=reduceActivity(rows,{operationId:'a',action:'write',status:'completed',relativePath:'scene.html'});
 assert.equal(reduceActivity(rows,{operationId:'a',action:'write',status:'started'})[0].status,'completed');
 assert.deepEqual(reduceActivity(rows,{operationId:'x',action:'write',status:'started',relativePath:'/secret'}),rows);
 for(let i=0;i<110;i++)rows=reduceActivity(rows,{operationId:String(i),action:'read',status:'completed'});assert.equal(rows.length,80);
});
