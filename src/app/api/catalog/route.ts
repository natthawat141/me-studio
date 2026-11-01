import { connection } from "next/server";
import { getProviderCatalog } from '@/server/config';

export async function GET() {
  await connection();
  try {
    return Response.json(getProviderCatalog(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // Configuration errors must not echo raw env content or validation input.
    return Response.json({error:{code:'INVALID_PROVIDER_CONFIG',message:'ตรวจสอบการตั้งค่าผู้ให้บริการบนเซิร์ฟเวอร์'}}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
