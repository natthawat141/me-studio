# ตัวอย่างเรนเดอร์ในเครื่อง

รัน `npm run local:doctor` แล้ว `npm run local:demo` จากราก cartoon-studio

ตัวอย่างนี้นำ HTML และเสียงที่สร้างไว้แล้วใน workspace เดิมมาประกอบเป็น MP4 ใหม่ด้วยตัวเรนเดอร์ local ไม่ได้เรียก AI หรือสร้างเสียงใหม่ การลด fps จากต้นฉบับเป็น 30 เป็นค่าเริ่มต้นของ demo นี้

- scene.html: สำเนา archive/legacy-animation/bew-mac-greeting-day.html เดิม ไม่มีการเปลี่ยนภาพหรือบท
- hello.mp3: สำเนา archive/legacy-animation/output/voice-mac-sawasdee-bew.mp3
- reply.mp3: สำเนา archive/legacy-animation/output/voice-bew-chai-laew.mp3
- project.json: กำหนด 1080×1920, 8 วินาที และจังหวะเสียงจาก timeline ใน HTML

ไฟล์ที่มี data-h2v-hide จะถูกซ่อนขณะเรนเดอร์ตามสัญญาของ source เดิม เสียงประกอบมาจากรายการ audio ใน manifest ไม่อัดเสียงจาก browser และไม่ต้องเปิดเว็บสตูดิโอระหว่างเรนเดอร์
