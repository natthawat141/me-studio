export interface DesktopScene { title: string; greeting: string; reply: string; background: string; sampleAudio: boolean }
export interface DesktopProject { id: string; title: string; revision: number; updatedAt: number; scene: DesktopScene }
export interface DesktopArtifact { id: string; url: string; createdAt?: string }
export interface DesktopEvent {
  type: string; kind?: string; projectId?: string; project?: DesktopProject; taskId?: string;
  status?: string; stage?: string; completed?: number; total?: number; artifact?: DesktopArtifact; name?: string;
}
export interface DesktopBridge {
  list(): Promise<DesktopProject[]>;
  create(input: { title: string }): Promise<DesktopProject>;
  update(input: { projectId: string; revision: number; changes: Partial<DesktopScene> }): Promise<DesktopProject>;
  preview(input: { projectId: string; revision: number }): Promise<{ url: string }>;
  render(input: { projectId: string; revision: number }): Promise<{ taskId: string }>;
  cancel(): Promise<void>;
  artifacts(input: { projectId: string }): Promise<DesktopArtifact[]>;
  save(input: { projectId: string; jobId: string }): Promise<{ saved?: boolean; cancelled?: boolean }>;
  configureMeta(input: { apiKey: string; modelId: string }): Promise<{ configured: boolean; verified: boolean }>;
  chat(input: { projectId: string; requestId: string; text: string }): Promise<{ text: string }>;
  cancelChat(): Promise<void>;
  newSession(input: { projectId: string }): Promise<void>;
  onEvent(callback: (event: DesktopEvent) => void): () => void;
}
declare global { interface Window { meStudio?: DesktopBridge } }
