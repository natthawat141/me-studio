import { getAgentSettings, type AgentSettings } from '@/lib/agent-settings';
import { readWorkspace, saveWorkspace } from '@/lib/local-store';

type Workspace = NonNullable<ReturnType<typeof readWorkspace>>;
export function persistProjectAgentSettings(workspace: Workspace, projectId:string, value:AgentSettings):Workspace {
  const settings=getAgentSettings(value);
  if(!workspace.projects.some((project)=>project.id===projectId)) throw new Error('Project not found');
  const next={...workspace,projects:workspace.projects.map((project)=>project.id===projectId?{...project,agentSettings:settings,updatedAt:Date.now()}:project)};
  saveWorkspace(next);
  return next;
}
