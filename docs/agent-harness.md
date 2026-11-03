# Agent harness และ memory ของ me studio

## สถานะ

มีแกน harness ภายในแล้ว ใช้ Pi agent-core 1.4.0 กับ memory บนดิสก์จริง ทดสอบด้วย scripted provider เพื่อไม่เสียค่า API มี Meta provider adapter และ native worker implementation แยกอยู่แล้ว แต่ยังไม่ได้ต่อกับแชต `/desktop` ปัจจุบัน และไม่ได้ยืนยัน live inference จากหน้านี้ ยังไม่มี HTTP chat endpoint, memory UI หรือ agent ที่สร้างวิดีโอครบจาก prompt แชตยังตอบแบบ mock และ catalog ยังระบุ liveChatEnabled=false ตามจริง ดู [คู่มือสำหรับ coding AI](ai-guide.md) เพื่อแยก implementation ภายในออกจากความสามารถที่เปิดในผลิตภัณฑ์

## ทดลอง

ต้องใช้ Node.js >=22.19.0 และ development dependencies จาก npm install/npm ci ตามปกติ:

```sh
npm run agent:demo
```

demo ใช้ loop/tool execution ของ Pi จริง แต่คำตอบเขียนไว้ล่วงหน้า ไม่มี HTTP, API key หรือ inference: เรียกเครื่องมือจำตัวละคร Milo → ปิดแล้วเปิด database connection → เปิด session ใหม่และตรวจ context → ตรวจว่าโปรเจกต์อื่นไม่ได้รับข้อมูลนี้ เก็บ database แยกใหม่ทุกครั้งใน `.studio/agent-demo/<uuid>/memory.sqlite` ไม่เขียนทับ memory ผู้ใช้ โค้ด scripted provider ไม่ถูก import ใน application runtime

## ส่วนที่นำมาใช้

Pi agent-core/pi-ai 1.4.0 และ TypeBox 1.3.27 ถูก pin เป็น npm dependencies พร้อม lockfile ไม่ fork ทั้ง repository ไม่มี coding CLI/bot/terminal/UI จาก upstream ในแอป เก็บ license/attribution ใน THIRD_PARTY_NOTICES.md และเหตุผล/แหล่งข้อมูลใน ADR 0005 Published artifact ใช้ TypeBox; main บน upstream อาจมี API ต่างออกไป

## Memory ที่มี

| ประเภท | ขอบเขต | ตัวอย่าง |
| --- | --- | --- |
| User preference | owner | ภาษาหรือรูปแบบที่เจ้าของกำหนด |
| Project memory | owner + project | ตัวละคร เสียง สไตล์ ข้อกำหนดซีรีส์ |
| Transcript/run | owner + project + session | ข้อความ tool calls/results สถานะ และ counters |

Facts มี source/sourceRef, revision และเวลาที่แก้ไข Stale write ถูกปฏิเสธ Forget ลบ value/sourceRef และเก็บ revision tombstone เพื่อป้องกันคำสั่งเก่าเขียนข้อมูลกลับโดยไม่ตั้งใจ อ่าน revision ของ key แล้วตั้งค่าใหม่ได้โดยตั้งใจ

Forget ลบเฉพาะ saved memory ไม่ลบ chat archive และไม่รับรองการ unlearn ข้อความที่ยังอยู่ในบทสนทนา ไม่ออกแบบให้เก็บ credentials ตัวตรวจปฏิเสธ key/รูปแบบ credential ที่ชัดเจน แต่ไม่ใช่ DLP ที่ตรวจความลับได้ทุกชนิด

Context ใส่ facts เป็น reference JSON ที่จำกัดขนาด พร้อมกลุ่มข้อความ user/assistant/tool ล่าสุดที่สมบูรณ์ ข้อความเก่ายังอยู่ใน archive ไม่มี auto-summary, embedding หรือ vector DB การค้นเป็น substring ของ key/value ซึ่งรองรับข้อความไทย ไม่ใช่ semantic retrieval

## เครื่องมือเริ่มต้น

- `recall_project_memory`: อ่าน/ค้น project facts กับ preference ของ owner เดียวกัน และอ่าน revision ของ key ที่ระบุ
- `remember_project_memory`: เขียน fact ในโปรเจกต์ โดย host ต้องอนุญาต และ value ต้องปรากฏตรงตัวในข้อความผู้ใช้รอบนั้น เก็บ run ID เป็นที่มา เป็น grounding check ไม่ใช่ semantic fact verification
- `forget_project_memory`: ลบ saved value โดย host ต้องอนุญาตและ revision ต้องตรง

Agent เลือก owner/project ผ่าน arguments ไม่ได้ User-wide preferences จัดการโดย trusted host code ไม่ใช่เครื่องมือเขียนข้ามโปรเจกต์ของ agent Host เพิ่มเครื่องมือผ่าน options.tools ได้ แต่ต้องมี grant เช่นกัน ไม่มี shell, Python, arbitrary filesystem หรือ automatic HTML execution ในชุดเริ่มต้น

Native Files panel ที่เปิดโฟลเดอร์/เล่นวิดีโอเป็นเครื่องมือ UI ของผู้ใช้ แยกจาก model tools ข้างต้น การเลือกโฟลเดอร์ใน UI ไม่ได้ให้สิทธิ์ harness อ่านไฟล์ทั้งหมดหรือรันไฟล์เหล่านั้นโดยอัตโนมัติ

## การเชื่อม backend

ให้ Next.js server code ใช้ `src/server/agent/index.mts` ที่มี server-only guard ส่วน runtime.mts ทดสอบด้วย Node/tsx ได้:

```ts
const harness = createStudioHarness({
  store,
  session: trustedSessionScope,
  model: operatorApprovedModel,
  stream: approvedProviderStream,
});
const result = await harness.run({
  requestId, text: userMessage,
  approvedTools: serverGrantedTools,
  signal, onEvent: sendSafeEvent,
});
```

ตัวแปรข้างต้นเป็น interface สำหรับ backend ที่จะเชื่อม ไม่ใช่ config ที่เปิด live inference ได้แล้ว session/model/stream/grants ต้องมาจาก trusted policy ห้าม map owner/model/base URL/grants ตรงจาก HTTP body Repository scoping ไม่ใช่ authentication และยังไม่มี protected local API

## Limits และ persistence

- Defaults: 6 model calls, 12 requested tool calls, input 8,000 characters, context 32,000 serialized characters, output cap 2,048 tokens/call และ cooperative timeout 120 วินาที
- Tool batch ที่เกิน budget ไม่ถูกรัน toolCalls นับคำขอจากโมเดล ไม่ใช่จำนวน side effects สำเร็จ Context bound เป็น characters ไม่ใช่ token estimator/ราคาเงินจริง Token counters อาศัย provider stream; fixture ไม่ใช่ billed usage
- Sequential tools และ stream options ปิด SDK automatic retry; live adapters ต้องยืนยันพฤติกรรมจริง
- Request ID/input/model เดิมที่ completed คืนผลเดิม Input เปลี่ยนแต่ใช้ ID เดิม conflict งาน failed/cancelled ต้องตั้งใจเริ่มด้วย request ID ใหม่
- Active run หนึ่งงานต่อ session เก็บ transcript เมื่อ message จบ พร้อม terminal status/result/error code ส่งออกเฉพาะ text delta และ status/tool metadata ที่จำเป็น ไม่ส่ง raw Pi/provider error objects เป็น public DTO

Cancellation/timeout เป็น cooperative: provider/tools ต้องเคารพ AbortSignal ไม่ใช่ hard sandbox Process ถูก kill/เครื่องดับอาจเหลือ running; ยังไม่มี crash recovery/lease takeover/resume side effects สำเร็จแล้วเปิด session/process ใหม่คุยต่อได้ งานไม่ completed จะไม่ถูก replay เข้า model context อัตโนมัติ

Node built-in node:sqlite แสดง ExperimentalWarning บน Node 22.22.3 ที่ตรวจ ไม่มี npm native SQLite binding เพิ่ม Database file ใช้ mode 0600 และ directory ใหม่ private เท่าที่ OS รองรับ ไม่เข้ารหัส database และไม่รับรอง Windows ACL Database มี application/schema marker ไม่ initialize ทับ SQLite ของแอปอื่นหรือไฟล์อ่านไม่ได้ ไม่มีการย้าย localStorage/IndexedDB เดิมอัตโนมัติ

ตรวจด้วย npm test, npm run lint, npm run build และ npm run agent:demo ยังไม่ได้ทดสอบ clean-machine/Linux/Windows/SaaS
