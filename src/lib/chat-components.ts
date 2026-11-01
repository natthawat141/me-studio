/** Typed, non-executable UI payloads. API responses must be runtime-validated before rendering. */
export type StoryboardScene = {
  id: string;
  title: string;
  durationSeconds: number;
  description: string;
  thumbnailUrl?: string;
};
export type ChatComponent =
  | { type: "storyboard"; id: string; title: string; scenes: StoryboardScene[] }
  | {
      type: "credit_approval";
      id: string;
      title: string;
      estimatedCredits: number;
      status: "pending" | "approved" | "declined";
      expiresAt?: string;
    }
  | {
      type: "job_status";
      id: string;
      status: "queued" | "running" | "completed" | "failed";
      message: string;
      progress?: number;
    };
/** Approval is a request to the backend, never a debit in the client. Server must verify ownership, amount, expiry and idempotency. */
export type ApprovalAction = {
  approvalId: string;
  decision: "approve" | "decline";
};

export function isChatComponent(value: unknown): value is ChatComponent {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string") return false;
  if (v.type === "storyboard")
    return (
      typeof v.title === "string" &&
      Array.isArray(v.scenes) &&
      v.scenes.every((scene) => {
        if (!scene || typeof scene !== "object") return false;
        const x = scene as Record<string, unknown>;
        return (
          typeof x.id === "string" &&
          typeof x.title === "string" &&
          typeof x.description === "string" &&
          typeof x.durationSeconds === "number" &&
          Number.isFinite(x.durationSeconds) &&
          x.durationSeconds >= 0 &&
          (x.thumbnailUrl === undefined || typeof x.thumbnailUrl === "string")
        );
      })
    );
  if (v.type === "credit_approval")
    return (
      typeof v.title === "string" &&
      typeof v.estimatedCredits === "number" &&
      Number.isFinite(v.estimatedCredits) &&
      v.estimatedCredits >= 0 &&
      (v.status === "pending" ||
        v.status === "approved" ||
        v.status === "declined") &&
      (v.expiresAt === undefined || typeof v.expiresAt === "string")
    );
  if (v.type === "job_status")
    return (
      typeof v.message === "string" &&
      (v.status === "queued" ||
        v.status === "running" ||
        v.status === "completed" ||
        v.status === "failed") &&
      (v.progress === undefined ||
        (typeof v.progress === "number" &&
          Number.isFinite(v.progress) &&
          v.progress >= 0 &&
          v.progress <= 100))
    );
  return false;
}
