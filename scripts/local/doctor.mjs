import { checkTools } from './tools.mjs';

const result = await checkTools();
console.log('ตรวจเครื่องสำหรับ me studio local renderer\n');
for (const check of result.checks) {
  console.log(`${check.ready ? 'พร้อม' : 'ยังไม่พร้อม'}  ${check.name}${check.ready ? ` — ${check.version}` : ''}`);
  if (!check.ready) console.log(`  ${check.help}`);
}
console.log(result.ready ? '\nพร้อมเรนเดอร์ในเครื่อง รัน npm run local:demo' : '\nแก้รายการที่ยังไม่พร้อมแล้วรัน npm run local:doctor อีกครั้ง');
process.exitCode = result.ready ? 0 : 1;
