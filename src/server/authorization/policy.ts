/** Pure authorization policy. The caller must verify the session and obtain
 * memberships and resources from trusted server-side storage, never the request body.
 * This module does not authenticate users or enforce access by itself. */
export type Principal = { userId: string };
export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type Membership = { userId: string; workspaceId: string; role: WorkspaceRole; status: 'active' | 'revoked' };
export type ProjectResource = { id: string; workspaceId: string };
export type ProjectAction = 'read' | 'edit' | 'delete';

const permitted: Record<ProjectAction, readonly WorkspaceRole[]> = {
  read: ['owner', 'admin', 'editor', 'viewer'],
  edit: ['owner', 'admin', 'editor'],
  delete: ['owner', 'admin'],
};
function hasMembership(actor: Principal | null, membership: Membership | null, workspaceId: string): membership is Membership {
  return Boolean(actor?.userId && workspaceId && membership?.status === 'active' && membership.userId === actor.userId && membership.workspaceId === workspaceId);
}
export function canAccessProject(actor: Principal | null, membership: Membership | null, project: ProjectResource | null, action: ProjectAction): boolean {
  if (!project?.id || !hasMembership(actor,membership,project.workspaceId)) return false;
  return permitted[action]?.includes(membership.role) ?? false;
}
export function canManageWorkspace(actor: Principal | null, membership: Membership | null, workspaceId: string): boolean {
  return hasMembership(actor,membership,workspaceId) && (membership.role === 'owner' || membership.role === 'admin');
}
