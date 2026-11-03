'use client';
import { useRef, useState } from 'react';
import { fileError,workspaceFiles } from '@/services/workspace-files';
import type { WorkspaceListing, WorkspacePreview } from '@/lib/workspace-files';

export function useWorkspaceFiles() {
  const [root,setRoot]=useState<WorkspaceListing>();
  const [folders,setFolders]=useState<Record<string,WorkspaceListing>>({});
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const [selected,setSelected]=useState<WorkspacePreview>();
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const generation=useRef(0);
  async function choose() {
    setPending(true);setError('');
    try {const next=await workspaceFiles().chooseFolder();if(next){generation.current++;setRoot(next);setFolders({[next.directory.id]:next});setExpanded({});setSelected(undefined);}}
    catch(error){setError(fileError(error));}finally{setPending(false);}
  }
  async function activate(id:string) {
    const version=++generation.current; setPending(true); setError(''); setRoot(undefined); setFolders({}); setExpanded({}); setSelected(undefined);
    try { const listing=await workspaceFiles().activateProject({id}); if(version!==generation.current)return true; setRoot(listing); setFolders({[listing.directory.id]:listing}); return true; }
    catch(error){if(version===generation.current)setError(fileError(error));return version!==generation.current;} finally{if(version===generation.current)setPending(false);}
  }
  function clear() { generation.current++; setPending(false); setRoot(undefined); setFolders({}); setExpanded({}); setSelected(undefined); setError(''); }
  async function toggle(id:string) {
    if(expanded[id]){setExpanded(s=>({...s,[id]:false}));return;}
    const version=generation.current;setError('');
    try {const listing=await workspaceFiles().listFolder({id});if(version!==generation.current)return;setFolders(s=>({...s,[id]:listing}));setExpanded(s=>({...s,[id]:true}));}
    catch(error){setError(fileError(error));}
  }
  async function openFile(id:string) {
    const version=++generation.current;setPending(true);setError('');
    try {const file=await workspaceFiles().openFile({id});if(version===generation.current)setSelected(file);}
    catch(error){if(version===generation.current)setError(fileError(error));}finally{if(version===generation.current)setPending(false);}
  }
  async function refresh() {
    if(!root)return;setError('');setPending(true);
    try{const listing=await workspaceFiles().listFolder({id:root.directory.id});setRoot(listing);setFolders({[listing.directory.id]:listing});setExpanded({});}
    catch(error){setError(fileError(error));}finally{setPending(false);}
  }
  return {root,folders,expanded,selected,pending,error,choose,activate,clear,toggle,openFile,refresh,closeFile:()=>{generation.current++;setSelected(undefined);setPending(false);}};
}
