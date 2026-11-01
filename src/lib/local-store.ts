import { agentSettingsSchema } from "./agent-settings";
import { isChatComponent } from "./chat-components";
import type { Media, Project, Settings } from "./studio-data";
type Workspace = {
  projects: Project[];
  selectedId: string;
  settings: Settings;
  previewWidth: number;
  revision?: number;
};
const key = "me-studio.workspace.v1";
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isProject(value: unknown): value is Project {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.updatedAt === "number" &&
    (value.pinned === undefined || typeof value.pinned === "boolean") &&
    (value.archived === undefined || typeof value.archived === "boolean") &&
    (value.videoId === undefined || typeof value.videoId === "string") &&
    (value.agentSettings === undefined || agentSettingsSchema.safeParse(value.agentSettings).success) &&
    Array.isArray(value.messages) &&
    value.messages.every(
      (message) =>
        isRecord(message) &&
        typeof message.id === "string" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.text === "string" &&
        (message.attachmentIds === undefined ||
          (Array.isArray(message.attachmentIds) && message.attachmentIds.every((id) => typeof id === "string"))) &&
        (message.files === undefined ||
          (Array.isArray(message.files) &&
            message.files.every((file) => typeof file === "string"))) &&
        (message.components === undefined ||
          (Array.isArray(message.components) &&
            message.components.every(isChatComponent))),
    )
  );
}
export function readWorkspace(): Workspace | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const data: unknown = JSON.parse(raw);
  if (
    !isRecord(data) ||
    !Array.isArray(data.projects) ||
    !data.projects.length ||
    !data.projects.every(isProject) ||
    typeof data.selectedId !== "string" ||
    !isRecord(data.settings) ||
    typeof data.settings.autoPlay !== "boolean" ||
    typeof data.settings.muted !== "boolean" ||
    typeof data.previewWidth !== "number" ||
    !Number.isFinite(data.previewWidth) ||
    (data.revision !== undefined && (!Number.isSafeInteger(data.revision) || (data.revision as number) < 0))
  )
    throw new Error("ข้อมูลโปรเจกต์ไม่ถูกต้อง");
  return {
    projects: data.projects,
    selectedId: data.selectedId,
    settings: { autoPlay: data.settings.autoPlay, muted: data.settings.muted },
    previewWidth: data.previewWidth,
    revision: typeof data.revision === "number" ? data.revision : 0,
  };
}
export class WorkspaceConflictError extends Error {
  constructor() { super("ข้อมูลถูกเปลี่ยนแปลงจากหน้าอื่น โปรดโหลดข้อมูลล่าสุดก่อนบันทึก"); }
}
/** Stale-snapshot guard only; localStorage cannot provide cross-process transactions. */
export function saveWorkspace(data: Workspace) {
  const current = readWorkspace(); // Throws on corrupt data; never overwrite it.
  if ((data.revision ?? 0) !== (current?.revision ?? 0)) throw new WorkspaceConflictError();
  const revision = (current?.revision ?? 0) + 1;
  localStorage.setItem(key, JSON.stringify({ ...data, revision }));
  data.revision = revision;
}
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("me-studio-media", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("media", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadMedia(): Promise<Media[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction("media").objectStore("media").getAll();
    request.onsuccess = () => {
      resolve(request.result as Media[]);
      db.close();
    };
    request.onerror = () => {
      reject(request.error);
      db.close();
    };
  });
}
export async function storeMedia(media: Media) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("media", "readwrite");
    transaction.objectStore("media").put(media);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}
export async function deleteMedia(id: string) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("media", "readwrite");
    transaction.objectStore("media").delete(id);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}
