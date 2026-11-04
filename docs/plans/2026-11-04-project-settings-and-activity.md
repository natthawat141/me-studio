# Project settings and visible agent activity implementation plan

> For implementers: this is the release plan and implementation checklist. Implementation was authorized earlier; the current request is to review and write the plan before resuming code changes. Read application/desktop/server/component instructions before editing the corresponding owners. Preserve existing uncommitted work.

## แผนส่งมอบเวอร์ชันใหม่ — 2026-11-04

### เป้าหมายและขอบเขต

ผู้ใช้บรีฟหรือสั่งงานผ่านแชต → agent ใช้เครื่องมือสร้างไฟล์จริงใน Project → เปิดผลงานในแอปได้ → ขอแก้และทำต่อได้ โดยไม่ต้องคัดลอกโค้ด ดาวน์โหลดไฟล์ที่อยู่ในเครื่องแล้ว หรือติดตั้ง skill เอง

คง Python Deep Agents เป็นแกน runtime และให้ Node/Electron ดูแลไฟล์ สิทธิ์ local config และงาน render ต่อไป งานรอบนี้คือเชื่อมความสามารถที่มีให้ทำงานครบตลอดเส้นทาง ไม่ใช่ย้าย framework อีกครั้ง ไม่เพิ่ม shell/terminal/browser automation ทั่วไปหรือ SaaS เข้ามาใน release นี้

### สถานะที่ตรวจได้ตอนวางแผน

- Git HEAD คือ `7eee12a` ซึ่งเป็นเอกสารแผนต่อจาก implementation `9f42eeb`; การมี commit เอกสารไม่ใช่การออก native release
- มีโค้ดแก้ค้างใน HTML validator, production tools, chat hook/sidebar และ desktop CSS/dialog พร้อม regression `tests/html-preview-metadata.test.mts` ที่ยังไม่ commit ต้องตรวจและนำเข้าทีละ slice ไม่ทิ้งหรือถือว่าเสร็จแล้ว
- Python Deep Agents มีอยู่แล้ว ไม่ต้องเริ่มย้ายจากศูนย์ ส่วนสถานะ native app ที่กำลังเปิดต้องตรวจใหม่ก่อนส่งมอบ ห้ามอนุมานจาก build หรือ Git HEAD
- ปัญหา meta validation และพื้นหลัง dialog มีหลักฐานด้านล่าง ส่วนคำตอบเชิงสร้างสรรค์ที่ดีขึ้นต้องวัดจากโจทย์จริง แก้ prompt หรือลง SDK อย่างเดียวไม่ใช่หลักฐาน

### ลำดับงานและจุดตรวจรับ

| ลำดับ | ผลที่ผู้ใช้ต้องเห็น | งานและจุดตรวจรับ |
| --- | --- | --- |
| 0. ล็อก baseline | งานเดิมและข้อมูลเดิมยังอยู่ | จัดรายการ diff ค้าง, ระบุ app/build commit ที่เปิดจริง, ใช้ fixture แยกจากแชต/โฟลเดอร์ผู้ใช้; ตรวจ active run/draft ก่อน reload |
| 1. สร้าง → เปิด → แก้ผลงาน | สั่งทำ HTML แล้วได้ไฟล์กับ preview ที่กดเปิดได้ | Task 0A: validator/error codes → verified artifact contract → scoped preview/source → chat/Files integration → HTML capture; ต้องผ่าน flow จริงครบก่อนเพิ่ม UI สถานะ |
| 2. แสดงงานที่กำลังทำ | รู้ว่ากำลังอ่าน/เขียนไฟล์ไหน ตรวจภาพ หรือ render อยู่ | Tasks 1–2: host events, activity history, chat/Project spinner, Stop/late-event filtering; ชื่อและ progress มาจาก tool จริง |
| 3. จัด Project และข้อมูลให้ถูก | ชื่อเริ่มจาก folder, เปลี่ยนชื่อ/source/output แล้วแชตและงานไม่หาย | Tasks 3–5: atomic native editor + run lease → stable app-owned working state/migration → compact dialog; ทดสอบ Cancel และ failed Save ก่อน success |
| 4. เก็บบั๊ก UI และพฤติกรรม agent | ลบแชตถูกเป้าหมาย อ่านคำตอบง่าย ไม่แนะนำให้เซฟไฟล์เอง | Task 0B ทำได้หลัง slice 1: dialog surface/target/focus; ตรวจ Markdown และพื้นที่ชื่อไฟล์; capability context/creative rules และ scenario evaluation ตามรายการด้านล่าง |
| 5. ออก native release | เปิดแอปรุ่นใหม่ที่มีการแก้จริงให้ทดลองได้ | Task 6: full regressions → package → actual native smoke → commit/push ตามสิทธิ์เดิม → เปิดแอปใหม่และตรวจ revision; cleanup เฉพาะ staging ที่ยืนยันว่าใช้สร้างใหม่ได้ |

แต่ละ slice ต้องผ่าน contract/service/UI ที่เกี่ยวข้องและบันทึกหลักฐานก่อนเลื่อนไป slice ถัดไป ไม่จบงานที่เปลี่ยนข้อความหรือ spinner อย่างเดียว และไม่รายงานว่า release เสร็จก่อนตรวจแอปแพ็กเกจจริง

### ข้อตกลงทางเทคนิคที่ต้องรักษา

1. **ไฟล์และผลงานเป็นผลจาก host:** สร้างเสร็จเมื่อเขียนไฟล์สำเร็จแล้วเท่านั้น; preview เปิดได้เมื่อ validate/compile และลงทะเบียน scoped artifact แล้ว ข้อความ model ไม่มีสิทธิ์สร้าง path/URL หรือสถานะสำเร็จเอง
2. **Preview ไม่อยู่ใน privileged DOM:** ใช้ trusted compiler และ surface ที่ isolate พร้อม host CSP/resource allowlist; ไม่ส่ง arbitrary HTML เข้า srcDoc แล้วถือว่าปลอดภัยเพราะมี sandbox เพียงอย่างเดียว ต้องตรวจ navigation, network และสิทธิ์ local assets ด้วย
3. **Capture ไม่เปลี่ยนงานที่กำลังแก้:** การแปลง HTML เดิมเป็น PNG ต้องไม่ reset current draft, narration, voice tracks หรือ version selection; มี output/image reference ของตัวเอง และรักษาต้นฉบับไว้
4. **แก้ directory เป็น transaction:** native picker เก็บค่าชั่วคราว; Save จึงเขียนพร้อมกัน; Cancel ไม่เปลี่ยน registry; host บล็อก path update ของ Project ที่กำลังทำงาน แม้ renderer ส่งคำขอตรง
5. **ความต่อเนื่องผูกกับ ID:** ชื่อและ directory เปลี่ยนได้ แต่ Project/chat/asset/version identity คงเดิม; ย้าย app state ด้วยการ copy/validate แบบมีขอบเขตและไม่ลบต้นทาง
6. **ขอบเขตสร้างสรรค์ซื่อสัตย์:** รองรับ declarative HTML/CSS/SVG และเครื่องมือ local ที่มีจริง; ไม่อ้างว่าแยกตัวละคร/สร้าง motion ทุกแบบจากภาพได้ หากเกินความสามารถต้องอธิบายข้อจำกัดและเสนอทางเลือกเฉพาะงาน

### ตรวจพฤติกรรม agent ด้วยโจทย์เดียวกัน

| โจทย์ | ผลที่ต้องได้ / สิ่งที่ห้ามเกิด |
| --- | --- |
| ขอไอเดียจากภาพแนบ แต่ยังไม่สั่งผลิต | ใช้ภาพจริงเมื่อ model รองรับ vision, แนะนำฉาก/จังหวะพร้อมเหตุผล, ไม่ render อัตโนมัติ |
| บรีฟยังไม่ชัด | ถามเฉพาะเรื่องที่เปลี่ยนทิศทาง ไม่สัมภาษณ์ซ้ำเรื่องที่ผู้ใช้ตอบแล้ว |
| บรีฟครบและบอกให้ทำ | ลงมือใช้ tool ต่อจนได้ผลงาน ไม่บังคับถาม/อนุมัติซ้ำทุกขั้น |
| ขอ HTML ให้ดู | สร้างไฟล์ใน Project, แนบผลงานที่เปิดได้, เปิด preview สำหรับคำขอให้ดู; ไม่ทิ้ง code block ยาวแทนการทำงาน |
| ขอเปิดไฟล์เดิม / แปลงเป็นภาพ | resolve ไฟล์จริง, เปิด viewer หรือคืน PNG จริง; ไม่แนะนำดาวน์โหลด/แคปจอเอง |
| ขอเลือกแนวภาพ | เสนอตัวเลือกตามโจทย์พร้อมภาพจากงานจริงเมื่อจำเป็น ไม่บังคับ 4 แบบหรือแนวการ์ตูนตายตัว |
| ขอเปลี่ยนเพียงจุดเดียว | อ่าน draft เดิม, รักษาทิศทางที่ตกลงและเวอร์ชันก่อนหน้า, ไม่ reset ฉาก/ตัวละคร/ความยาว |
| ขอไม่มีเสียง / ขอใช้เสียงที่ตั้งไว้ | ใช้ค่าที่ขอและ config จริง; เสียงล้มเหลวต้องแจ้ง ไม่เปลี่ยนเป็นเงียบโดยไม่บอก |
| save/render ล้มเหลวหรือกด Stop | แจ้งสาเหตุที่แยกประเภทได้, ไม่อ้างว่าสำเร็จ, ไม่มี event เก่ามาเปิด panel หรือฟื้น spinner |

เริ่มจาก deterministic offline fixtures พิสูจน์ plumbing และผลไฟล์ จากนั้นแยกตรวจคุณภาพด้วย model/config ที่ผู้ใช้ใช้จริงเมื่อมีการทดลองที่ได้รับอนุญาต บันทึก input/model/settings/tool results/output และสิ่งที่ยังตรวจไม่ได้ ไม่กำหนดคำตอบสวยเพียงคำตอบเดียวเป็น expected output

### ความสามารถถัดจาก release นี้

คง research/Tavily และการขยายเนื้อหา skills เป็น backlog ที่แยกตรวจรับได้ ไม่ซ่อนอยู่ใต้คำว่า “harness เสร็จ” หลัง flow หลักผ่านแล้วจึงทำ:

- Search/Extract tool ผ่าน host พร้อม URL ต้นทาง, credential configuration, timeout/result budget และ network boundary; ไม่มี key ให้แจ้งตรง ๆ ไม่แต่งผลค้นหา
- คัด reference จาก legacy-animation แบบรักษาต้นฉบับ; ปรับ skills research/storytelling/storyboard/HTML animation/inspection ให้เป็นแนวทางตามงาน ไม่บังคับ template เดิม
- ใช้ชุดโจทย์ข้างต้นเทียบผลก่อน/หลัง และทดสอบการแก้ต่อเนื่อง ไม่รับประกันความเก่งจากชื่อ SDK/model

### เกณฑ์ออกเวอร์ชันและรายงานส่งมอบ

- [ ] Slice 1–4 และ acceptance ด้านท้ายเอกสารมีหลักฐานผ่าน ไม่ใช้คำว่า partial แทนข้อบังคับที่ยังขาด
- [ ] ทำ HTML → preview → PNG → silent MP4 → revision ได้ใน Project ทดสอบ; ตรวจ actual media decode/ภาพและเวลาตามงานที่เปลี่ยน
- [ ] เปลี่ยน source/output, ปิด–เปิดแอป และเปิดไฟล์เก่าได้; draft/attachment/chat history ไม่หาย
- [ ] Delete target/Cancel/Escape, สลับแชตระหว่าง run, Stop, narrow layout, light/dark และ focus ผ่าน
- [ ] Unit/Python/API/UI/lint/build และ packaged native checks ตาม Task 6 ผ่าน หรือระบุ blocker จริงโดยไม่เรียก release complete
- [ ] รายงาน commit, path ของ native app, revision ที่เปิดจริง, checks ที่ทำ, live-provider checks ที่ยังไม่ได้ทำ และข้อจำกัดที่เหลือ

ไม่รับประกันเวลา “ไม่ถึงหนึ่งชั่วโมง” ก่อนพิสูจน์ migration และ isolated preview; ประเมินใหม่หลัง slice 1 ด้วยผลทดสอบจริง หากติดข้อจำกัดให้รายงานพร้อมหลักฐานและเดินงานอิสระที่เหลือต่อ

Goal: repair HTML creation/preview and delete-chat confirmation, then show actual agent activity in chat/sidebar and provide a compact Project editor with folder-derived names and editable source/output directories.
Architecture: trusted Node production tools emit small structured activity events using current request/session identity. React derives running/unread state without treating model prose as progress. Electron retains native directory selection and Project registry ownership; Project/chat identity survives name/path changes.
Tech stack: existing React/TypeScript, Base UI Dialog/DropdownMenu/Tooltip, Lucide, Electron IPC, Python Deep Agents, Node production tools. No new UI dependency.

## Observed baseline and boundaries

- Baseline: 9f42eeb on feat/local-render-runtime; no uncommitted app changes when planning started.
- tool_start/tool_end, render progress, requestId/sessionId filtering and Stop already exist. Current UI maps most tools to generic “กำลังทำงาน”; neither Project-relative file names nor activity history reach it.
- Native ProjectFolders already supports create/relink/setOutput with persisted identity, canonical paths and duplicate-folder checks. The current dialog exposes directory changes but lacks a cohesive name/path editor and a native rename operation.
- Source/output changes currently persist immediately through native pickers. The proposed editor needs a staged selection + atomic Save boundary to make Cancel truthful.
- Critical continuity detail: drafts, raster assets and skill preferences currently live under source/.me-studio/skills. Relinking source alone can make a continuing conversation lose its working draft/assets. Address this explicitly before claiming seamless directory changes.
- Preserve existing Project/chat IDs, SQLite, local drafts, file grants and original media. No moving or deleting user directories, no paid provider validation, and no active-app reload during the planning turn.
- Reuse the Codex screenshot's hierarchy and interaction patterns with me studio components: flat rows, folder icon/name field, quiet path details, neutral hairlines and footer Cancel/Save. One source folder and one output folder per Project in this version.

## Accepted product behavior

- Chat: “กำลังเขียน scene.html”, “กำลังตรวจภาพตัวอย่าง”, “กำลังเรนเดอร์วิดีโอ 24/72 เฟรม”, or “กำลังคิด”. Expand the activity row to see completed/failed operations. Do not show generated source file cards unless the user requests them.
- Activity describes actual tool execution. Writing begins when the host starts saving a file, not when model prose promises to create one. Pure model streaming may say “กำลังคิด/กำลังออกแบบ”; no invented filename or percentage. Distinguish draft/style preview from final MP4.
- Sidebar: one small neutral spinner at the trailing edge of the running chat. If its Project is collapsed, show that indicator on the Project row instead. A completed unread result gets a small dot, cleared when that chat is visible and the result arrives/is opened. Failed/cancelled work does not get a success dot.
- Spinner and ellipsis actions occupy stable separate space, never overlap a long chat title. Provide accessible status text and reduced-motion behavior. Switching chats does not stop or relocate the running work.
- Create: choose a directory, fill the project name from its folder name, and allow a custom name. Once the user edits the name, subsequent folder choices do not overwrite it. Empty/all-whitespace names resolve to the folder name at Save; enforce the existing 80-character display-name limit.
- Edit: Project menu → “แก้ไขโปรเจกต์”, then name, source folder and output folder. Each folder row shows its name, a subdued full path (wrapped/truncated with accessible full text) and a change button. Save applies one validated update; Cancel changes nothing.
- New Project names default to nameOrigin=folder. Explicit user edits make nameOrigin=custom. Old records conservatively migrate to custom; do not infer or rewrite a user's intent merely because name equals folderName.
- Source change updates the Files tree and next production request. Default output follows newSource/output; a custom output remains unchanged. Existing chats/artifacts remain accessible. Keep the previous Files selection if a relink fails.
- Directory updates are blocked by the host while that Project has an active run. The dialog explains “รอให้งานจบ หรือหยุดงานก่อนเปลี่ยนโฟลเดอร์”; it never cancels work implicitly. Another Project may still be edited.
- Default workspace remains app-managed for this slice; folder editing applies to directory Projects.

## Priority fixes added after user testing — 2026-11-04

These are pending implementation, not completed fixes. Complete Tasks 0A and 0B before the activity/sidebar and Project editor features below.

Observed evidence:
- Real save_html_animation attempts failed before writing scene.html. Replaying a failed HTML document with the packaged browser reproduced `page.evaluate: Error: HTML_ACTIVE_CONTENT`. The document contained ordinary `<meta charset="utf-8">`; removing only its metadata tag in an isolated diagnostic made the same preview succeed. The validator's allowed-element list excludes meta.
- The bridge compares the whole exception message with safe error codes, so Playwright's prefixed error becomes generic TOOL_ERROR. The agent loses the actionable cause and falls back to inline code. A later write_project_file succeeded, but this does not create a preview artifact.
- WorkspaceFiles classifies .html as text, and WorkspaceFilePreview renders it in a pre element. A file existing on disk therefore does not prove it can be previewed as animation in the app.
- The user's 08:14 screenshot adds two acceptance failures: when asked to open an existing local file, the assistant suggests downloading it and asks whether the user is on mobile/desktop; when asked to convert HTML to an image, it provides no image and describes a generic image-system failure. This is screenshot evidence of the response/UI behavior; the new conversion attempt's exact tool error has not yet been traced. Do not assume an image-generation provider failed.
- An isolated browser session with a synthetic chat reproduced the delete confirmation's transparent surface: computed background `rgba(0, 0, 0, 0)`. The light-theme owning CSS has no explicit dialog surface and the generic bg-popover token is not configured. Cancel preserved the synthetic chat. No real chat was deleted; no wrong-target deletion has been demonstrated.

## Task 0A: Make HTML creation produce a real, openable preview

Files: src/server/video/html-authoring.mts; src/server/video/production.mts; src/server/video/native-production.mts; src/server/agent/runtime.mts; desktop/main.mjs; desktop/preload.cjs; desktop/workspace-files.mjs; src/lib/workspace-files.ts; src/hooks/use-chat-prototype.ts; src/components/studio/desktop-screen.tsx; src/components/preview/workspace-panel.tsx and its owning CSS. Reuse existing scoped artifact/file services.
Tests: create tests/html-preview.test.mts and tests/ui/html-preview.spec.ts; extend tests/creative-assets.test.mts and tests/python-agent.test.mts.

1. Add failing regressions using synthetic full HTML documents with doctype, html/head/body, title, charset and viewport metadata. Verify benign metadata succeeds while meta refresh, script/event handlers and external resources remain blocked. Keep host-owned CSP/base URL authoritative; do not broadly allow arbitrary meta attributes.
2. Normalize benign document metadata before compilation, and preserve structured safe validation codes across the browser/tool boundary. Test that the agent receives HTML_ACTIVE_CONTENT/HTML_EXTERNAL_RESOURCE with a bounded useful reason rather than a raw stack trace or generic TOOL_ERROR.
3. Publish a typed HTML preview artifact only after the host has saved and validated the actual file. It carries an opaque scoped ID, a display name and verified preview capability; no model-invented path/URL is accepted. Return registered file references for explicit Project-file writes as well, distinguishing a saved source file from a validated preview.
4. Add an isolated HTML preview surface using the existing trusted compiler and allowlisted local assets. Keep it outside the privileged app DOM; model scripts, arbitrary disk reads and outbound resource requests remain unavailable. Provide “ตัวอย่าง / โค้ด”; existing HTML files must pass validation before preview capability is granted. Show an actionable failure when unsupported HTML cannot be previewed.
5. Connect a successful creation result to an openable chat artifact and automatic preview opening for an explicit “สร้าง/ทำ HTML ให้ดู” request. Do not automatically open arbitrary tool reads or restore a closed panel from a late/stopped request. Refresh an already-open Files tree after actual writes. Keep the user's draft/selection and previous accepted artifact on failure.
6. Add a scoped tool for previewing/capturing existing Project HTML, reusing the validated compiler/local browser rather than requiring the model to rewrite the source. Input is an approved relative path or registered file ID plus bounded dimensions/time. HTML-to-image captures a real PNG into a versioned output location, registers it as a chat file/artifact and returns image content for model inspection. Keep original HTML intact; do not execute arbitrary source scripts or accept model-supplied absolute paths. This local capture requires no image-generation API/key.
7. Supply explicit trusted runtime context to the agent: it is operating in the native Mac app, which selected Project/file capabilities exist, and which preview/capture/open-result actions are actually supported. Context describes capabilities; it does not expand grants. “Open this file” must resolve a real scoped artifact and have the UI confirm opening. Do not invent Finder/browser-launch abilities. Do not suggest downloading an already-local file or ask for device information the host already knows.
8. Tighten the creative tool contract: ordinary creation requests use the save/preview tools and concise chat text; full code is appropriate when the user asks for code/explanation. A failed save or source-only write cannot be reported as a successfully opened preview. HTML-validation, local-capture, file-read and provider errors remain distinguishable; do not label all failures as an unavailable image-generation service. Do not fix this merely by hiding code blocks or telling the user to copy/save HTML manually.
9. Verify offline actual-SDK scenarios for: validation failure → corrected HTML → saved file → preview artifact; “เปิดไฟล์นี้” → actual in-app opening; “แปลง HTML นี้เป็นภาพ” → real registered PNG visible in chat and its viewer. UI tests must observe rendered content/CSS motion, switch to source, reload/reopen artifacts and verify request/session scope and cancellation. Conversion must preserve the source file and handle an unsafe/missing file with a useful bounded error. Source-write success or a textual success claim alone is insufficient acceptance.
10. Run `node --import tsx --test tests/html-preview.test.mts tests/creative-assets.test.mts tests/python-agent.test.mts`, then production build and focused `PLAYWRIGHT_CHANNEL=chrome npm run test:ui -- tests/ui/html-preview.spec.ts`. Record failing-to-passing evidence before committing.

## Task 0B: Restore the delete-chat confirmation surface

Files: src/components/chat/chat-sidebar.tsx; src/components/studio/desktop-screen.css; src/components/studio/desktop-theme.css. Inspect src/components/ui/dialog.tsx and global tokens, but prefer the owning desktop styles for a narrow fix. Change deletion state logic only if a regression demonstrates a behavioral fault.
Tests: extend tests/ui/folder-projects.spec.ts or add tests/ui/chat-delete-dialog.spec.ts.

1. Add a failing appearance regression for the existing confirmation in light mode: nontransparent surface, readable text, contained buttons and responsive width. Cover dark mode as well; a dialog being visible is insufficient.
2. Give the dialog an explicit theme-appropriate surface, subtle neutral boundary and restrained spacing. Preserve the requested thin visual style, backdrop and keyboard focus indicator. Do not add a thick white border or heavy shadow.
3. With synthetic chats A and B, open A and choose B's delete action: the dialog must name B. Cancel/Escape must preserve both; confirming must remove only B and leave A active. Separately delete the active chat and verify fallback remains in the correct Project. Test long Thai names and a narrow viewport.
4. Verify focus returns to a useful surviving control on Cancel/confirmation. When deleting a running synthetic chat, confirm request-scoped Stop and ignore subsequent late events; tests must not touch real user conversations.
5. Run `PLAYWRIGHT_CHANNEL=chrome npm run test:ui -- tests/ui/folder-projects.spec.ts tests/ui/chat-delete-dialog.spec.ts` after production build, adjusting the command if coverage stays in the existing file. Inspect light/dark screenshots and commit the fix.

## Task 1: Define truthful activity events

Files: src/lib/workspace-files.ts; src/server/agent/runtime.mts; src/server/video/native-production.mts; src/server/video/production.mts; desktop/preload.cjs if filtering needs adjustment.
Tests: create tests/production-activity.test.mts; extend tests/python-agent.test.mts and tests/worker-cancellation.test.mts where relevant.

1. Add a regression for a real host save operation emitting start/end, a failed save emitting failure, and zero renderer events containing HTML, text contents, image bytes, keys or absolute paths. Run it and observe failure first.
2. Add a shared validated activity DTO. Minimal payload:

```ts
type ProductionActivity = {
  kind: 'production'; type: 'activity';
  requestId: string; sessionId: string;
  operationId: string;
  action: 'read' | 'write' | 'inspect' | 'render';
  status: 'started' | 'completed' | 'failed';
  relativePath?: string;
  completed?: number; total?: number;
};
```

3. Emit safe metadata from the host tool boundary. Use an allowlist per tool; do not forward generic tool arguments. write_project_file uses its validated relative path; save_html_animation reports scene.html as an internal working file; render progress uses actual frame counters. Model text and SDK scratch operations are not evidence of Project disk writes.
4. Keep request/session filtering and Stop behavior; bound field lengths/activity count and ignore stale/duplicate operation updates.
5. Verify `node --import tsx --test tests/production-activity.test.mts tests/python-agent.test.mts tests/worker-cancellation.test.mts`, then commit this contract slice.

## Task 2: Activity row and sidebar running/unread states

Files: src/hooks/use-chat-prototype.ts; create src/lib/production-activity.ts and src/components/chat/chat-activity.tsx; modify src/components/chat/chat-transcript.tsx, src/components/chat/chat-sidebar.tsx, src/components/studio/desktop-screen.tsx and the existing owning studio CSS (resolve its import in desktop-screen.tsx).
Tests: create tests/production-activity-state.test.mts; extend tests/ui/production-stream.spec.ts and tests/ui/sidebar-flow.spec.ts.

1. Write state tests covering start/completion/failure, Stop, two successive requests, out-of-order events, deleted chat, switching chats and collapsed Projects. State derives from request identity, never an artificial timer. Observe the missing behavior first.
2. Add a bounded activity reducer/list keyed by operationId. Keep active work transient; persist only unread-result state using the existing storage schema with a backward-compatible default.
3. Render an expandable light activity row and trailing 12–14px indicator. Keep one status announcement, avoid announcing every token/frame, and respect reduced motion.
4. Add UI scenarios: switch away while running; spinner stays with the correct chat; collapsed Project aggregates it; success while away shows a dot; open clears it; Stop clears spinner; late events cannot restore it; title/actions do not overlap at narrow widths.
5. Run focused unit/UI checks against a production build, inspect light/dark screenshots, then commit.

## Task 3: Project naming and atomic edit contract

Files: desktop/project-folders.mjs; desktop/main.mjs; desktop/preload.cjs; src/lib/workspace-files.ts; src/services/workspace-files.ts.
Tests: tests/project-folders.test.mts; add an IPC/registry regression for active-run path updates.

1. Add failing tests for folder-derived name, custom-name preservation, old registry compatibility, name-only update preserving IDs, duplicate directory rejection, Cancel/no-op and failed atomic save preserving old state.
2. Add nameOrigin: folder|custom and outputOrigin: source-default|custom. Legacy nameOrigin defaults custom. Infer outputOrigin from whether a legacy explicit outputPath exists. Keep corrupt registries untouched.
3. Add native staged folder-selection tokens: beginProjectEdit → opaque edit token; pick source/output → candidate token; saveProjectEdit validates ownership, canonical directories, duplicate binding and current registry revision before one queued atomic write. Tokens have bounded lifetime/count, are invalidated on close/save/restart, and never accept renderer-supplied absolute paths. Existing create flow can reuse this selection mechanism.
4. Main/worker must check active Project identity when applying directory edits. Production holds a host-side Project binding lease through completion/cancellation; update and run-start cannot race into different roots. The old run's captured roots remain immutable. Do not depend only on disabled frontend buttons.
5. Run registry/IPC tests and commit. Existing legacy relink/setOutput methods remain wrappers over the validated update path where still used.

## Task 4: Preserve working state across source changes

Files: src/server/video/native-production.mts; src/server/video/production.mts; src/server/video/project-workspace.mts; add a small state-location/migration module under src/server/video if needed.
Tests: create tests/project-state-relink.test.mts.

1. Reproduce the current loss of draft/assets when source changes using temporary folders and a stable Project/session ID; never use real user folders.
2. Store native conversation working drafts, normalized asset registry and skill enable preferences under host-owned userData/project-state/<projectId>/<sessionId>. Pass an explicit stateRoot into production tools. Source/output remain the user-selected creative-file/render locations. CLI can retain its current fallback layout.
3. Lazy migration reads only known bounded app-state files from the old .me-studio location. Validate schemas, canonical containment, symlinks, asset hashes and sizes. Copy atomically; leave originals intact; never overwrite corrupt destination state. Custom SKILL.md references remain scoped to the selected source directory rather than being silently moved.
4. Check source A → source B with the same chat: current draft, chosen image IDs and version history remain available; new writes target B/current output; old artifact opening still uses its original registered output root. No arbitrary old-folder read permission carries over.
5. Run targeted state/asset/render tests and commit.

## Task 5: Compact create/edit Project dialog

Files: create src/components/chat/project-dialog.tsx and src/hooks/use-project-editor.ts; modify src/components/studio/desktop-screen.tsx, src/components/chat/chat-sidebar.tsx and existing owning CSS.
Tests: tests/ui/folder-projects.spec.ts; add tests/ui/project-editor.spec.ts.

1. Write UI tests for folder-first naming, keeping a typed name after folder changes, edit existing name/path, picker Cancel, dialog Cancel, Save failure, active-run block and repeated open/close. Include Thai IME Enter behavior.
2. Extract the existing inline Project dialogs from desktop-screen into one focused feature component; state/transport calls live in the hook/service. Use installed Dialog/Button/Input/Dropdown primitives.
3. Match the supplied Codex layout with a name field, source folder section, output section and Cancel/Save footer. Full paths remain readable on narrow screens; close buttons and action targets never overlap names. Keep thin neutral focus indicators in light/dark modes.
4. After success refresh Project metadata and the Files tree only when its source changed; preserve chat ID, draft text, scroll and open artifact. On failure keep the previous metadata/tree and form edits for retry.
5. Run focused UI checks, inspect screenshots at desktop and narrow panel widths, then commit.

## Task 6: Verification, docs and native delivery

1. Update PRODUCT.md, DESIGN.md, docs/architecture.md and docs/ai-guide.md with final behavior; add implementation evidence to this plan, keeping credentials out.
2. Run `npm test`, `npm run agent:python-test`, `npm run test:api`, `npm run lint`, `npm run build`, then `PLAYWRIGHT_CHANNEL=chrome npm run test:ui`. Do not run UI tests while Next rebuilds the same output.
3. Run relevant offline render/worker tests. Native main/preload changes require `npm run desktop:build`.
4. Before replacing the app, inspect active jobs/drafts and quit normally. Reopen the packaged app; verify real picker Cancel/selection, Project rename/source/output persistence, chat continuity, old artifact playback, status indicators and keyboard interaction. Do not issue paid API calls merely to validate UI/config refactoring.
5. Review the final diff, preserve existing credentials/data, use the previously authorized Git/release path, and remove only verified regenerated staging after the new build works.

## Release acceptance

- An ordinary request to create HTML saves a real scoped file and returns an in-app rendered preview without manual copying. Failed validation is actionable and never presented as successful creation.
- HTML preview/source switching works with full documents and registered assets, preserves scope on reload, and cannot execute untrusted scripts in the app.
- Asking to open an existing local HTML result opens its verified in-app preview; asking to convert it to an image returns an actual registered PNG embedded in chat. Neither flow requires manual downloading, source copying or an image-generation API key.
- Delete confirmation has an opaque readable surface in both themes, names the selected target accurately and preserves unrelated chats. Cancel/Escape and confirmed deletion are verified with synthetic data.
- User can identify the current real operation and affected working file without opening a source editor.
- Sidebar makes running work discoverable across chats and shows completed unread results accurately.
- A chosen folder provides a usable default Project name; custom names remain intentional and persistent.
- Project editor supports atomic name/source/output changes, truthful Cancel and host-enforced busy behavior.
- Source relink preserves conversation/draft/assets and earlier artifacts, while new production uses the new binding.
- Existing history, drafts, source files, original media and secrets remain intact. No live-provider quality claim follows from an offline test pass.

Execution order: Task 0A repairs the core create-file/preview flow; Task 0B repairs delete confirmation; Tasks 1–2 deliver activity visibility; Tasks 3–4 establish the data/path contract; Task 5 assembles the accepted Project editor; Task 6 verifies the packaged product. No time guarantee is attached until state migration is exercised against synthetic old registries.

## Implementation ledger — 2026-11-04

- Implementing the approved plan in place on feat/local-render-runtime; the pre-existing edits belong to this task and are preserved.
- Ruling: preview HTML is compiled in the worker, local raster assets are inlined after containment checks, and an opaque studio-preview protocol serves it under an additional sandbox/script-none CSP. The viewer iframe grants neither scripts nor same-origin. No arbitrary source srcDoc is introduced.
- Ruling: capture_project_html is independent of saveHtml. It writes a unique PNG and returns a bounded inspection image without resetting the accepted animation or voice. HTML source versions use distinct design-N.html filenames.
- Ruling: working drafts/assets are session-scoped in userData/project-state; skill enable preferences are shared at Project scope. Custom skill text remains in the selected source. Relink migrates known old state before changing the source binding, preserves originals, and refuses unsafe/corrupt input.
- Tests observed red then green: file preview, production result publication/capture state preservation, activity reducer, atomic Project update, staged edit cancellation, state relink migration.
- Initial verification: 80 Node tests, 13 Python tests, 7 focused UI tests, lint/build/API checks passed. Actual Python Deep Agents offline demo authored/inspected/revised/rendered a silent 3-second MP4. This is tool plumbing evidence, not a live model-quality claim. Final changes still require the final full checks/package/native inspection below.
- Final fresh-context review identified and fixed draft containment after state relocation, run-start/registry-commit race, stale asynchronous auto-opening, legacy explicit-default output mismatch, and missing-source relink. Added failing regressions before fixes, then verified reopening production tools with migrated state, registry barrier/acquisition ordering, renamed-folder recovery, and deferred UI resolver cancellation.
- Native version is 0.2.0; packaging records sourceRevision/version in runtime.json. About no longer incorrectly says native AI is disconnected/sample-only. No credentials were inspected or changed.
- Final automated verification: 83/83 Node tests, 13/13 Python tests, 48/48 browser UI tests, lint, Next build, API integration, packaged-worker cancellation and desktop smoke passed. A repeated Python run under simultaneous render-test load hit its test timeout; a sequential rerun completed all 13 in 0.945 seconds. The timeout is recorded rather than treated as a provider failure.
- Native delivery evidence: the packaged 0.2.0 app records source revision 5896fc2cea2a9c4c7c3f86d7d43446a6145822c6 and was opened on this Mac. The real folder picker selected the isolated native-preview fixture; the Project name was derived from its folder and Cancel left the existing Project list intact. Existing conversations remain present.
- Actual native Files inspection opened a declarative HTML/CSS animation through studio-preview in the fitted preview pane, showed a PNG, and played the real offline-generated MP4 from 0:00 through 0:03 using the local player. The script-containing fixture remained escaped source and displayed HTML_ACTIVE_CONTENT. No user chat was submitted or deleted during these checks.
- Delivery boundary: this release verifies tool execution, file/result publication, isolated preview, activity and Project state. Live provider creative quality, Tavily/research and richer skill content remain separately testable backlog. Local packaging is unsigned; this is not a notarized distribution claim.
