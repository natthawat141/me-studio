# me studio local-first

เป้าหมายปัจจุบันคือเตรียมเวอร์ชัน local สำหรับทดลอง workflow และ demo hackathon โดยยังไม่สร้างระบบ SaaS ทั้งชุด ดูลำดับงานใน [แผน local-first](plans/2026-11-02-local-first.md)

## สิ่งที่ใช้ได้จริง

- เว็บ studio เดิม: โปรเจกต์/ไฟล์ใน browser, แชตจำลอง, เล่นและดาวน์โหลดวิดีโอเดิม
- CLI ใหม่: เรนเดอร์ HTML ที่ตรวจแล้วและมี `window.seek(ms)` เป็น MP4 H.264/AAC พร้อมประกอบเสียงตาม timeline
- เก็บ snapshot ของ HTML/asset/เสียงและ manifest พร้อม hash และ job status แยกแต่ละการเรนเดอร์ ไม่ทับผลงานก่อนหน้า
- ตรวจขนาดภาพ fps codec และความยาวด้วย ffprobe ก่อนเผยแพร่ชื่อไฟล์ `video.mp4`

CLI ยังไม่เชื่อมกับปุ่มใน studio และยังไม่สร้างบท/HTML/เสียงด้วย AI ไม่ใช่ prompt-to-video ที่เสร็จครบแล้ว ไม่มี API key ใดถูกใช้ในการตรวจหรือ demo renderer นี้

## ติดตั้งและเริ่ม

ต้องใช้ Node.js >=22.19.0 พร้อม npm และติดตั้ง development dependencies ตามปกติ:

```sh
npm install
npm run local:setup
npm run local:doctor
npm run dev -- --hostname 127.0.0.1 --port 3100
```

สำหรับการติดตั้งตาม lockfile ใช้ `npm ci` แทน `npm install` ได้ ไม่ต้องใช้ key เพื่อเปิดเว็บหรือรัน demo renderer

`local:setup` ตรวจ Node/FFmpeg/ffprobe/browser และติดตั้ง Chromium จาก Playwright เฉพาะเมื่อไม่พบ browser ที่รองรับ ถ้ามี Chrome ในตำแหน่งมาตรฐาน จะใช้ process และ temporary browser context แยกสำหรับการเรนเดอร์ ไม่ใช้โปรไฟล์หรือแท็บส่วนตัวของผู้ใช้ ไม่มีการติดตั้ง OS package อัตโนมัติ

FFmpeg ต้องมีทั้ง `ffmpeg` และ `ffprobe` อยู่ใน PATH:

- macOS ที่มี Homebrew: `brew install ffmpeg`
- Linux/Windows: ใช้แพ็กเกจตามระบบจาก [FFmpeg downloads](https://ffmpeg.org/download.html) แล้วรัน doctor อีกครั้ง
- Linux ที่ไม่มี browser system libraries อาจต้องติดตั้ง OS dependencies ของ Playwright ตาม distribution; setup ไม่ยกระดับสิทธิ์หรือลง package เหล่านี้ให้เอง

ตรวจจริงบน macOS/Node 22.22.3/FFmpeg 8.1/Chrome ในเครื่องนี้แล้ว ส่วน clean-machine และ Linux/Windows ยังไม่ได้ยืนยัน

## เรนเดอร์ตัวอย่าง

ไม่ต้องเปิด Next.js ไว้ระหว่างเรนเดอร์:

```sh
npm run local:demo
```

คำสั่งนี้เรนเดอร์ animation/เสียงเดิมใน `examples/local-render/` ใหม่เป็นคลิปแนวตั้ง 1080×1920, 30fps, 8 วินาที ไม่ได้เรียกโมเดลหรือสร้างเสียงใหม่ เมื่อเสร็จจะแสดง absolute path ของ MP4 สามารถนำเข้าไฟล์นี้ใน studio ด้วยปุ่ม + เพื่อเล่นได้ การนำเข้าเป็นการคัดลอกลง browser storage ไม่ใช่การเชื่อมกับ disk job โดยอัตโนมัติ

สำหรับโปรเจกต์ของตัวเอง:

```sh
npm run local:render -- --project /absolute/path/project.json
npm run local:render -- --project /absolute/path/project.json --output /absolute/path/renders
```

กด Ctrl+C หนึ่งครั้งเพื่อยกเลิกและรอให้ process ปิด งานจะมีสถานะ cancelled และไม่เผยแพร่ MP4 ที่ยังไม่เสร็จ หาก kill process โดยตรงหรือไฟดับ job อาจคงสถานะ running; ยังไม่มีตัวกู้คืนงานหลัง crash สามารถใช้ snapshot เปิดงานใหม่ได้

## รูปแบบโปรเจกต์

```json
{
  "version": 1,
  "title": "คลิปของฉัน",
  "entry": "scene.html",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "durationSeconds": 30,
  "assets": ["images/background.png", "fonts/thai.woff2"],
  "audio": [
    { "file": "voices/intro.mp3", "startMs": 0, "volume": 1 },
    { "file": "voices/scene-two.mp3", "startMs": 8000, "volume": 1 }
  ]
}
```

- ทุก path อ้างจากโฟลเดอร์ที่มี project.json; ระบุ asset ทุกไฟล์ที่ HTML ต้องใช้ ไม่มีการเปิดทั้ง directory ผ่าน server
- ใช้ path ปกติแบบ `/`; รองรับช่องว่าง/Unicode แต่ไม่รับ URL, parent path, hidden files, path escape หรือ symlink ที่ชี้ออกจากโปรเจกต์
- ความกว้าง/สูง 64–1920 และเป็นเลขคู่; fps 24/25/30/60; ระยะเวลาไม่เกิน 300 วินาที; assets ไม่เกิน 100 ไฟล์; audio ไม่เกิน 24 tracks
- แต่ละไฟล์ไม่เกิน 50 MiB รวมไม่เกิน 250 MiB; manifest ไม่เกิน 64 KiB; แต่ละงาน timeout 20 นาที
- `startMs` ต้องเริ่มภายในคลิป; volume อยู่ระหว่าง 0–2; เสียงถูก pad/trim ให้พอดี timeline แล้ว mix เป็น AAC
- ถ้าไม่มี audio จะใส่ silent AAC track ให้ ไม่ได้สร้างเสียงพูดขึ้นมา

## สัญญาของ HTML

HTML ต้องกำหนดภาพจากเวลาโดยตรง:

```js
window.seek = function (milliseconds) {
  // วาดหรือปรับฉากให้ตรงเวลานี้ การเรียกเวลาเดิมต้องให้ภาพเดิม
};

if (!window.__SCRUB__) {
  // เล่น live preview ด้วย requestAnimationFrame ได้ในส่วนนี้
}
```

renderer ตั้ง `window.__SCRUB__ = true` ก่อนโหลดหน้า แล้วเรียก `seek(frame * 1000 / fps)` ทีละเฟรม ฟังก์ชัน seek สามารถคืน Promise ซึ่ง renderer จะรอได้ ต้อง preload asset ที่ต้องใช้และไม่อิงนาฬิกาจริงหรือ random ที่ไม่กำหนด seed

โหลด asset/font จากไฟล์ที่ระบุใน manifest เท่านั้น renderer ปิด page requests ไป origin อื่น ไม่มีการโหลด CDN, remote fonts, iframe, worker หรือ package จากอินเทอร์เน็ต ไม่มีเสียงจาก browser capture: ใช้รายการ audio ใน manifest เท่านั้น `data-h2v-hide` จะถูกซ่อนตาม source contract เดิม

ใช้ฟอนต์ local ที่ระบุชัดหากต้องการผลลัพธ์สม่ำเสมอข้ามเครื่อง การใช้ system fallback อาจเปลี่ยนรูปร่างหรือการตัดบรรทัดตาม OS/browser; ยังไม่รับรองผล byte-identical ข้ามเครื่อง

## ผลลัพธ์และการเปิดงานซ้ำ

```text
.studio/renders/<uuid>/
  job.json              สถานะ ความคืบหน้า hash เวลา และ error หากล้มเหลว
  input/project.json    manifest ที่ใช้จริง (นำมา render ซ้ำได้)
  input/...             snapshot ของ HTML และ asset/เสียง
  poster.png            เฟรมแรก ถ้า capture สำเร็จ
  probe.json            codec/size/fps/duration ที่ตรวจจากไฟล์จริง
  video.mp4             มีเมื่อ encode และตรวจผ่านแล้ว
  encoder.log           มีเมื่อ FFmpeg ส่ง diagnostic
```

สถานะ: queued → running → succeeded / failed / cancelled ไฟล์ input และ log ยังคงอยู่เมื่องานล้มเหลวเพื่อวิเคราะห์ ไม่มีการ resume frames ที่ค้างอยู่หรือ queue แบบ durable

นำ `input/project.json` มาเป็น `--project` ของงานใหม่ได้ โดยไม่พึ่งไฟล์ต้นฉบับที่อาจแก้ไปแล้ว ทุกครั้งสร้าง UUID ใหม่ ไม่มีการ overwrite เวอร์ชันเดิม สามารถจัดการพื้นที่ `.studio/` ได้เอง ไฟล์เหล่านี้ถูก ignore จาก git และ ESLint

## ขอบเขตความปลอดภัย

ใช้กับ HTML ที่เจ้าของเครื่องตรวจแล้วเท่านั้น CLI นี้ไม่มี upload/HTTP execution endpoint และไม่ใช่ security boundary สำหรับโค้ดจากผู้ใช้ทั่วไป การจำกัด page networking, allowlisted assets, fresh browser context และ environment ที่ไม่ส่ง provider keys ให้ subprocess เป็นการลดสิทธิ์ ไม่ใช่หลักฐานว่ารันโค้ดไม่ไว้ใจได้อย่างปลอดภัย

ก่อนเชื่อม AI ให้สร้าง/รันโค้ดอัตโนมัติ ต้องเลือก isolation และการอนุมัติ executable output เพิ่มเติม ส่วน paid API ผ่านเว็บยังต้องมี local session/origin protection, allowlisted models, explicit approval, budget และ idempotency ตาม architecture เดิม

## การตรวจ

```sh
npm test
npm run lint
npm run build
npm run local:doctor
npm run local:smoke
```

smoke ใช้ browser และ FFmpeg จริง สร้าง test tone ในเครื่อง ตรวจสีของเฟรมตาม seek, พลังงานเสียงก่อน/หลัง startMs, การเรนเดอร์ซ้ำจาก input snapshot, คลิปที่ไม่มี narration, missing seek, blocked external asset, cancellation และ invalid audio ไม่ใช้ AI, provider key หรือ paid API

ผลลัพธ์ที่ตรวจได้ไม่ใช่การรับรองคุณภาพการเล่าเรื่อง เสียง AI ความปลอดภัย SaaS หรือความพร้อมตามกติกา hackathon
