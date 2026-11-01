import { chatTurnRequestSchema, type ChatTurnRequest } from "./api-contract";
// UI adapter: replace this implementation with a real API adapter later.
// No network call, model, generation, or rendering takes place here.
export async function requestAssistant(
  request: ChatTurnRequest,
  signal: AbortSignal,
): Promise<string> {
  const turn = chatTurnRequestSchema.parse(request);
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const finish = () => { signal.removeEventListener("abort", abort); resolve(); };
    const timer = setTimeout(finish, 900);
    const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
    signal.addEventListener("abort", abort, { once: true });
  });
  return `บันทึกคำสั่ง “${turn.message}” ไว้ในโปรเจกต์แล้ว ขณะนี้ยังไม่ได้เชื่อม AI จึงยังสร้างหรือแก้ไขคลิปให้ไม่ได้ คุณสามารถนำเข้าวิดีโอเพื่อเล่นในพื้นที่ด้านขวาได้`;
}
