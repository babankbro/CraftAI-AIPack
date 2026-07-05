import { handlers } from "@/auth";
import { NextRequest } from "next/server";

/**
 * Next.js (ในเวอร์ชันนี้) ตัด basePath ออกจาก req.url ก่อนส่งถึง Route Handler แล้ว
 * (ยืนยันด้วย runtime test) แต่ next-auth ต้องการให้ pathname ที่มันเห็นตรงกับ
 * config.basePath (มาจาก NEXTAUTH_URL="<origin>/aipack/api/auth") ทั้งฝั่ง parse action
 * ขาเข้า และฝั่งสร้าง URL ขาออก (เช่น redirect_uri ไป Google) — จึงต้องเติม /aipack
 * กลับเข้าไปเองตรงนี้ก่อนส่งต่อให้ next-auth ไม่งั้นทุก action จะ throw UnknownAction
 * และ redirect_uri ที่ส่งให้ Google จะขาด /aipack (Google จะปฏิเสธด้วย redirect_uri_mismatch)
 */
const BASE_PATH = process.env.BASE_PATH || "/aipack";

function withBasePath(req: NextRequest): NextRequest {
  const url = new URL(req.url);
  if (url.pathname.startsWith(BASE_PATH)) return req;
  url.pathname = `${BASE_PATH}${url.pathname}`;
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  return handlers.GET(withBasePath(req));
}

export async function POST(req: NextRequest) {
  return handlers.POST(withBasePath(req));
}
