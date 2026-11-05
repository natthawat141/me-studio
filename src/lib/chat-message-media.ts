import type {ChatArtifact} from './chat-prototype';
import type {ChatFileRef} from './workspace-files';
const fileKey=(file:ChatFileRef)=>`${file.projectId??''}:${file.id}`;
/** Normalize at render time too so saved chats from older releases are repaired visually. */
export function messageMedia(message:{files?:ChatFileRef[];artifacts?:ChatArtifact[]}){
 const artifacts=[...new Map((message.artifacts??[]).map(a=>[`${a.nativeProjectId??''}:${a.id}`,a])).values()];
 const represented=new Set(artifacts.flatMap(a=>(a.files??[]).map(fileKey)));
 const files=[...new Map((message.files??[]).map(f=>[fileKey(f),f])).values()].filter(f=>!represented.has(fileKey(f)));
 const hasFinalVideo=artifacts.some(a=>a.kind==='video');
 const earlierFiles=hasFinalVideo?files.filter(f=>f.kind==='video'):[];
 return {files:hasFinalVideo?files.filter(f=>f.kind!=='video'):files,artifacts,earlierFiles};
}
