import { connection } from "next/server";
export async function GET() {
  await connection();
  return Response.json({status:'ok',service:'me-studio',scope:'liveness'}, {headers:{'Cache-Control':'no-store'}});
}
