import {execFileSync} from 'node:child_process';
import {cp,mkdir,rm,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const python=resolve('.studio/python-env/bin/python');
try{await access(python);}catch{throw Error('Run npm run agent:python-setup first');}
execFileSync(python,['-m','PyInstaller','--noconfirm','--clean','--onedir','--name','me-studio-agent','--distpath','.studio/python-dist','--workpath','.studio/python-build','--specpath','.studio/python-build','--collect-all','deepagents','--collect-submodules','langgraph','--collect-submodules','langchain','--collect-submodules','langchain_openai','--copy-metadata','deepagents','--copy-metadata','langchain','--copy-metadata','langchain-core','--copy-metadata','langchain-openai','--copy-metadata','langgraph','--paths','python/me_studio_agent','python/me_studio_agent/worker.py'],{stdio:'inherit'});
const output=resolve('.studio/desktop-build/runtime/python-agent');
await mkdir(resolve('.studio/desktop-build/runtime'),{recursive:true});
await rm(output,{recursive:true,force:true});
await cp(resolve('.studio/python-dist/me-studio-agent'),output,{recursive:true,verbatimSymlinks:true});
const version=execFileSync(join(output,'me-studio-agent'),['--version'],{encoding:'utf8'}).trim();
if(version!=='me-studio-agent python protocol=1')throw Error('PYTHON_AGENT_BUILD_FAILED');
if(execFileSync(join(output,'me-studio-agent'),['--check'],{encoding:'utf8'}).trim()!=='me-studio-agent python sdk-ready protocol=1')throw Error('PYTHON_SDK_BUILD_FAILED');
// Include the installed distributions' own license texts with the frozen runtime.
const licenses=resolve('.studio/python-notices');
await rm(licenses,{recursive:true,force:true});
execFileSync(python,['-c',`import importlib.metadata as m, pathlib, shutil, sysconfig, sys, json
out=pathlib.Path(${JSON.stringify(licenses)});out.mkdir(parents=True,exist_ok=True)
for d in m.distributions():
 for f in d.files or []:
  if any(word in str(f).lower() for word in ('license','copying','notice')) and '.dist-info/' in str(f):
   source=d.locate_file(f)
   if source.is_file():
    target=out/d.metadata['Name']/pathlib.Path(str(f));target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
shutil.copyfile(pathlib.Path(sysconfig.get_path('stdlib'))/'LICENSE.txt',out/'PYTHON-LICENSE.txt')
(out/'runtime.json').write_text(json.dumps({'python':sys.version.split()[0],'openai':m.version('openai'),'protocol':1}))
`]);
await cp(licenses,join(output,'notices'),{recursive:true});
console.log(version);
