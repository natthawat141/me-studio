export type ChatDraft = { text: string; attachmentIds: string[] };
/** In-session drafts; never stores provider keys or credentials. */
export class DraftStore {
  private drafts = new Map<string, ChatDraft>();
  save(projectId: string, draft: ChatDraft) {
    this.drafts.set(projectId, {text:draft.text,attachmentIds:[...draft.attachmentIds]});
  }
  read(projectId: string): ChatDraft {
    const draft = this.drafts.get(projectId);
    return draft ? {text:draft.text,attachmentIds:[...draft.attachmentIds]} : {text:'',attachmentIds:[]};
  }
}
