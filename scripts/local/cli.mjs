import { parseArgs } from 'node:util';
import { renderProject } from './render.mjs';

const abort = new AbortController();
const cancel = () => { if (!abort.signal.aborted) { console.log('\nกำลังหยุดเรนเดอร์...'); abort.abort(); } };
process.once('SIGINT', cancel);
process.once('SIGTERM', cancel);
try {
  const { values } = parseArgs({ options: { project: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean', short: 'h' } } });
  if (values.help) {
    console.log('npm run local:render -- --project /path/to/project.json [--output /path/to/renders]\nใช้เฉพาะ HTML ที่ตรวจแล้วและมี window.seek(milliseconds)');
  } else {
    if (!values.project) throw new Error('ระบุ --project เช่น npm run local:demo');
    const job = await renderProject(values.project, {
      outputRoot: values.output, signal: abort.signal,
      onProgress: (event) => console.log(`${event.stage}  ${event.framesCompleted}/${event.totalFrames} เฟรม`),
    });
    console.log(`\nเรนเดอร์สำเร็จ: ${job.outputPath}\nใช้เวลา ${(job.elapsedMs / 1000).toFixed(1)} วินาที`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'เรนเดอร์ไม่สำเร็จ');
  process.exitCode = abort.signal.aborted ? 130 : 1;
} finally {
  process.removeListener('SIGINT', cancel);
  process.removeListener('SIGTERM', cancel);
}
