import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAccessProject, canManageWorkspace } from '../src/server/authorization/policy';

const actor={userId:'alice'};
const project={id:'project-a',workspaceId:'workspace-a'};
const membership={userId:'alice',workspaceId:'workspace-a',role:'editor' as const,status:'active' as const};

test('active workspace member can only exercise their role within that workspace',()=>{
  assert.equal(canAccessProject(actor,membership,project,'read'),true);
  assert.equal(canAccessProject(actor,membership,project,'edit'),true);
  assert.equal(canAccessProject(actor,membership,project,'delete'),false);
  assert.equal(canAccessProject(actor,membership,{...project,workspaceId:'workspace-b'},'read'),false);
});
test('missing identity, revoked membership and membership of another user fail closed',()=>{
  assert.equal(canAccessProject(null,membership,project,'read'),false);
  assert.equal(canAccessProject(actor,null,project,'read'),false);
  assert.equal(canAccessProject(actor,{...membership,status:'revoked'},project,'read'),false);
  assert.equal(canAccessProject(actor,{...membership,userId:'bob'},project,'edit'),false);
});
test('read-only viewer cannot edit; owner and admin can manage project lifecycle',()=>{
  const viewer={...membership,role:'viewer' as const};
  assert.equal(canAccessProject(actor,viewer,project,'read'),true);
  assert.equal(canAccessProject(actor,viewer,project,'edit'),false);
  assert.equal(canAccessProject(actor,viewer,project,'delete'),false);
  for(const role of ['owner','admin'] as const) assert.equal(canAccessProject(actor,{...membership,role},project,'delete'),true);
});
test('workspace administration requires the same actor and workspace with an active admin or owner membership',()=>{
  assert.equal(canManageWorkspace(actor,membership,'workspace-a'),false);
  assert.equal(canManageWorkspace(actor,{...membership,role:'admin'},'workspace-a'),true);
  assert.equal(canManageWorkspace(actor,{...membership,role:'owner'},'workspace-b'),false);
  assert.equal(canManageWorkspace(null,{...membership,role:'owner'},'workspace-a'),false);
});
