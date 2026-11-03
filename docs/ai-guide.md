# คู่มือเริ่มงานสำหรับ AI ที่พัฒนา me studio

ใช้ [AGENTS.md](../AGENTS.md) เป็นกติกาหลัก และตรวจโค้ดจริงก่อนสรุปความสามารถ สถานะด้านล่างตรวจจากโค้ดวันที่ 2026-11-03; ผลทดสอบในแผนเก่าเป็นหลักฐานของรอบนั้น ไม่รับรอง checkout ปัจจุบันโดยอัตโนมัติ

## อ่านอะไรตามลำดับ

1. [AGENTS.md](../AGENTS.md): ขอบเขตงาน กติกา UI/data/security และคำสั่งตรวจงาน
2. [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md): หน้าหลักที่ยอมรับแล้วและความสามารถที่มีจริง
3. [architecture.md](architecture.md): เส้นทางข้อมูลและสิ่งที่ยังเป็นเป้าหมาย
4. กติกาใกล้ไฟล์ที่จะเปลี่ยน: [UI](../src/components/AGENTS.md), [native desktop](../desktop/AGENTS.md), [server/harness/memory](../src/server/AGENTS.md)
5. [CONTRIBUTING.md](../CONTRIBUTING.md), [ACCEPTANCE.md](ACCEPTANCE.md), แผน/ADR ที่ตรงกับงาน แล้วอ่าน implementation และ tests

แอปและ Git root คือ `cartoon-studio/` ไม่ใช่ parent `aicatoon/` ตรวจ pwd, git status และ package.json ก่อนทำงาน รักษาไฟล์ที่ผู้ใช้หรือแชตอื่นแก้ค้างไว้

## หน้าที่ของเอกสาร

| เอกสาร | เก็บอะไร |
| --- | --- |
| AGENTS.md และไฟล์ย่อย | กติกาที่ใช้ซ้ำระยะยาว ไม่ใช่รายงานความคืบหน้า |
| CLAUDE.md / GEMINI.md / .github/copilot-instructions.md | จุดเข้าของเครื่องมือ อ้างอิงกติกาหลัก ไม่เขียนคู่มือซ้ำ |
| PRODUCT.md / DESIGN.md | ขอบเขตและสถานะผลิตภัณฑ์ / visual และ interaction ที่ยอมรับ |
| docs/architecture.md / docs/agent-harness.md | ชั้นระบบ / API และ invariants ของ harness และ product memory |
| docs/plans/ / docs/decisions/ | แผน/หลักฐานตามวันที่ / เหตุผลการตัดสินใจสถาปัตยกรรม |
| docs/model-research-* | Primary sources, วันที่และ exact model/voice/API IDs |

AGENTS.md เป็นคำแนะนำให้ AI **ที่เขียนโค้ดให้เรา** ไม่ใช่ runtime memory ของ AI ในผลิตภัณฑ์ และไม่ใช่สิทธิ์ให้รัน shell/อ่านไฟล์/ใช้เงิน Product memory เป็น SQLite ภายใต้ trusted host scope; ห้ามนำ repository instructions ไปใส่ prompt แล้วถือว่าแก้ authorization แล้ว

## ระบบปัจจุบันมีอะไรจริง

| ส่วน | สถานะและข้อจำกัด | จุดเริ่มอ่าน |
| --- | --- | --- |
| Desktop Home/chat/search/settings | Frontend ทดลอง flow ได้ คำตอบ/ผลงานเป็นตัวอย่าง Settings เก็บ metadata, key input ปิดอยู่ | [desktop-screen.tsx](../src/components/studio/desktop-screen.tsx), [use-chat-prototype.ts](../src/hooks/use-chat-prototype.ts) |
| Native Files / video player | อ่านโฟลเดอร์ที่เลือกจริง เปิด media/text จริง ไม่อัปโหลดและไม่เขียนไฟล์ | [workspace-panel.tsx](../src/components/preview/workspace-panel.tsx), [workspace-files.mjs](../desktop/workspace-files.mjs) |
| Provider catalog | Safe metadata/defaults จาก config; key presence ไม่ใช่ successful inference | [provider-config.ts](../src/lib/provider-config.ts), [config.ts](../src/server/config.ts) |
| Harness + memory | Pi loop + scoped SQLite กับ offline scripted streams มี grants/budgets/revisions/idempotency | [runtime.mts](../src/server/agent/runtime.mts), [store.ts](../src/server/memory/store.ts) |
| Native worker / Meta adapter | มี implementation แยกและ dormant; desktop chat ไม่เรียก ไม่ใช่ live end-to-end verification | [worker.mts](../desktop/worker.mts), [meta-provider.mts](../src/server/agent/meta-provider.mts) |
| Reviewed HTML/audio → MP4 | CLI/worker renderer แยก ใช้ input ที่ตรวจแล้ว ไม่ใช่ sandbox สำหรับโค้ด AI ทั่วไป | [render.mjs](../scripts/local/render.mjs), [local-development.md](local-development.md) |
| Terminal / general browser / Python tool execution | ยังไม่มีใน desktop V1 และไม่ใช่ Files panel | ต้องกำหนด scope/permission/runtime ก่อนเพิ่ม |
| Cloud accounts / sync / billing / durable queue | ยังไม่ได้ทำเป็น SaaS | PRODUCT.md และ architecture.md ระบุ target ไม่ใช่ระบบที่เปิดใช้แล้ว |

หลักฐานรอบก่อน: [Files panel](plans/2026-11-03-files-panel.md), [frontend](plans/2026-11-03-chat-first-frontend.md), [command search](plans/2026-11-03-command-search.md), [provider standby](plans/2026-11-03-provider-standby.md) และ [model research](model-research-2026-11-03.md) ตรวจใหม่เมื่อแก้ส่วนที่เกี่ยวข้อง

## UX ที่ต้องรักษา

- เปิดแอปเป็น Home และช่องเริ่มแชต ใช้ **แชตใหม่** ไม่ต้องสร้าง Project ก่อนเริ่มแชต และไม่มีฟอร์มกรอกบทพูดทีละตัวละคร
- ขาว/สว่าง sidebar โปร่งแบบ Mac ตัวอักษรน้ำหนักปกติ ไอคอนเส้นบางสีเดียว ไม่เติม emoji, หัวข้อประดับ, gradient/card หรือขอบหนาโดยพลการ
- Sidebar / chat / optional right panel; ศึกษา DeepSeek/ChatGPT เป็น reference โดยไม่เปลี่ยนแอปเป็น upstream fork
- Navigation ด้านบนใช้ `layout/desktop-navigation` แถวเดียวทั้งหน้าต่าง แยกปุ่มเปิดแผง Files ออกจากปุ่มซ่อนรายการไฟล์ภายในแผง เมื่อยุบประวัติแชตบน desktop จะเหลือ icon rail; ซ่อน tree ต้องไม่สร้าง video element ใหม่
- Composer ใช้ Prompt Kit ที่มีแล้ว dialog/menu ใช้ Base UI/shadcn ไอคอน Lucide ตรวจของเดิมก่อนสร้าง primitive
- แผงขวาปิดตอนเริ่ม เปิดเมื่อเรียก Files หรือกด artifact; รักษาร่างแชต การปิด–เปิดและ focus return
- Hover/focus เป็นเทากลาง รวม dialog ผ่าน portal ห้ามแก้ด้วยการลบ focus indication
- Settings รองรับหลาย provider แยก configuration จาก model choice ไม่บังคับ Meta อย่างเดียว
- Backend harness เป็น Python ได้ในอนาคต แต่การเปลี่ยนภาษาไม่ใช่ prerequisite ของงาน frontend หรืองานแถม

DESIGN.md เป็น source of truth หากผู้ใช้แก้ direction ให้ปรับ canonical docs พร้อม implementation แทนการสะสมข้อยกเว้นหลายไฟล์

## เส้นทางข้อมูล

### หน้าสนทนาตัวอย่าง

`/desktop` → `DesktopScreen` → `use-chat-prototype` → validated local state/storage

Key `me-studio.chat-ui.v1` แยกจาก legacy/native projects อย่าล้าง/ย้ายข้อมูลเพื่อแก้ UI ข้อมูลอ่านไม่ได้ต้องรายงานและเก็บต้นฉบับ Attachments เก็บ bytes ใน memory ของแชต หลังส่งมีเพียงชื่อไฟล์ ไม่ใช่ upload/persisted asset

### ไฟล์จริงในแอป Mac

`WorkspacePanel` → `use-workspace-files` → service → `window.meStudioFiles` → preload → owned-main-frame IPC → `WorkspaceFiles`

Native picker กำหนด root และ service ออก opaque IDs; renderer ส่ง path ตรงเพื่ออ่านไฟล์ไม่ได้ Media ใช้ studio-file protocol บน session ของหน้าต่าง รองรับ range/HEAD สำหรับ seek ห้ามเปลี่ยนเป็น readFile ทั้งวิดีโอหรือเปิด file:// แบบกว้าง HTML/SVG/Python เป็น escaped text การเปิดโฟลเดอร์ไม่ได้ grant ให้ AI รันโค้ด

### Harness และความจำ

Trusted host กำหนด owner/project/session, model/transport และ approved tools → Pi harness → scoped tools/store

รักษา [harness invariants](agent-harness.md): grounding/provenance, grants, context/call limits, request ID, revisions/tombstones และ cancellation Memory ไม่ใช่ credential store; forget ไม่ลบ transcript หรือทำให้โมเดล unlearn Worker local-owner policy ไม่ใช่ multi-tenant authentication

## วิธีเริ่มงานตามประเภท

| งาน | ขั้นตอนและการตรวจ |
| --- | --- |
| Frontend | อ่าน owning component/CSS/primitives; แก้ให้ถูกชั้น; รักษา draft/focus/IME; npm test/lint/build แล้ว test:ui และดูหน้าจอจริง |
| Native Files/IPC | อ่าน desktop/AGENTS.md และ contract/service; ตรวจ forged IDs/containment/symlinks/bounds/range/HEAD/cancel; ใช้ [unit tests](../tests/workspace-files.test.mts) และ [UI tests](../tests/ui/workspace-files.spec.ts); desktop:build แล้วลอง picker/play/seek จริง |
| Provider/harness/memory | แยก metadata/transport/live integration; ตรวจ primary docs และ host policy; ใช้ synthetic fixtures/offline streams; relevant tests + agent:demo เมื่อเปลี่ยน harness; test:api เมื่อเปลี่ยน config/API |
| Renderer | local:doctor, relevant tests และจริง render/probe เมื่อเปลี่ยน renderer; อ้างอิง local-development.md ไม่ claim ว่ามี arbitrary-code sandbox |
| Markdown-only | ตรวจ path/link/import, ชื่อ npm script, consistency และ git diff --check; ไม่ต้อง rebuild/repackage หรือปิดแอปผู้ใช้ |

คำสั่งเต็มอยู่ใน AGENTS.md/package.json บน Mac นี้ใช้ `PLAYWRIGHT_CHANNEL=chrome npm run test:ui` ได้ อย่าเทียบ mock bridge กับ native verification หรือ metadata/scripted test กับ paid generation ดู empty/error states และรายงาน visual/native checks ที่ทำไม่ได้

## การใช้กับเครื่องมือ AI

- เริ่มจาก application root เพื่อให้ Git/npm ถูกต้อง ถ้าเริ่ม parent ให้ตาม workspace AGENTS.md มายังแอป
- CLAUDE.md import `@AGENTS.md`; GEMINI.md import `@./AGENTS.md`; Copilot มี .github/copilot-instructions.md ชี้กติกากลาง อ่าน nested rules ตามพื้นที่ที่เปลี่ยนด้วย
- การสร้างไฟล์ไม่พิสูจน์ว่าทุกเครื่องมือโหลด context แล้ว หลังเปิด session ใหม่ ขอให้ AI สรุป entry route, ส่วน mock/real, คำสั่งตรวจ และไฟล์กติกาที่อ่าน ตรวจคำตอบกับเอกสารนี้ ถ้าไม่โหลดให้ระบุไฟล์ให้อ่านตรง ๆ ก่อนเริ่มงาน
- งานเอกสารนี้ไม่ติดตั้ง/ล็อกอิน/แก้ global settings ของ coding tools และไม่แก้ memory ส่วนตัวนอก repository

โครงสร้าง wrapper อ้างอิงเอกสารทางการ ตรวจ 2026-11-03: [Claude Code imports](https://code.claude.com/docs/en/memory), [Gemini CLI context/imports](https://geminicli.com/docs/cli/gemini-md/), [GitHub Copilot repository instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions) การรองรับอาจต่างตามเวอร์ชัน/IDE จึงต้องตรวจ loaded context จริง

## Video harness update

Native video mode now connects through the AI-provider Settings button and local credential-file picker. See [video-harness.md](video-harness.md), which supersedes the earlier sample-only descriptions for explicitly connected native sessions. New backend tools are under src/server/video; unconfigured web/native sample mode is preserved.
