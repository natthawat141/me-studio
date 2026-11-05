import {test} from 'node:test';
import assert from 'node:assert/strict';
import {messageMedia} from '../src/lib/chat-message-media';
import type {ChatFileRef} from '../src/lib/workspace-files';
const image:ChatFileRef={id:'image',name:'preview.png',relativePath:'preview.png',kind:'image'};
const video:ChatFileRef={id:'video',name:'video.mp4',relativePath:'video.mp4',kind:'video'};
test('one file renders once; files already represented by an artifact do not get another player',()=>{
 const artifact={id:'artifact',title:'Finished',kind:'video' as const,src:'studio-media://video/video.mp4',poster:'' as const,files:[video]};
 const result=messageMedia({files:[image,image,video,video],artifacts:[artifact,artifact]});
 assert.deepEqual(result.files,[image]);assert.deepEqual(result.artifacts,[artifact]);
});
test('distinct versions and project scopes remain separate even with identical filenames',()=>{
 const other={...image,id:'other'};const scoped={...image,projectId:'different-project'};
 assert.deepEqual(messageMedia({files:[image,other,scoped]}).files,[image,other,scoped]);
});

test('earlier rendered attempts remain accessible without extra inline players',()=>{
 const earlier={...video,id:'earlier'};
 const artifact={id:'final',title:'Final',kind:'video' as const,src:'/demos/greeting.mp4',poster:'' as const,files:[video]};
 const result=messageMedia({files:[earlier,video,image],artifacts:[artifact]});
 assert.deepEqual(result.files,[image]);assert.deepEqual(result.earlierFiles,[earlier]);
});
