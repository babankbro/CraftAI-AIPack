import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * RBAC proxy (เดิมชื่อ middleware — Next.js 16 เปลี่ยนชื่อ file convention) — กันเส้นทาง CAT/CAM ตามบทบาท (SRS FR-1.2/1.3)
 *
 * หมายเหตุสำคัญ (verified ด้วย runtime log, Next.js 16.2.9):
 * req.nextUrl.pathname **รวม** basePath อยู่แล้ว (ต่างจาก behavior เดิมที่เอกสาร/เทรนนิ่งข้อมูลเก่าบอกว่าไม่รวม)
 * และ req.nextUrl.basePath อ่านได้ค่าว่างในบริบทนี้ — จึงต้องตัด/ต่อ basePath เองจาก env ตรง ๆ
 * ไม่พึ่ง Next.js auto-handle เพื่อกันหลุด (ละเมิด NFR-9.2)
 */
const BASE_PATH = process.env.BASE_PATH || "/aipack";

function stripBasePath(pathname: string): string {
  if (pathname === BASE_PATH) return "/";
  if (pathname.startsWith(`${BASE_PATH}/`)) return pathname.slice(BASE_PATH.length);
  return pathname;
}

function redirectTo(req: Parameters<Parameters<typeof auth>[0]>[0], targetPathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = `${BASE_PATH}${targetPathname}`;
  return NextResponse.redirect(url);
}

/**
 * ปฏิเสธ request: หน้าเว็บ (page route) → redirect ไปหน้าที่กำหนด (เดิม)
 * แต่ API route (/api/...) → ต้องตอบ JSON 401/403 เสมอ ห้าม redirect ไปหน้า login (HTML)
 * เพราะฝั่ง client เรียก fetch() แล้ว res.json() ตรง ๆ — ถ้าโดน redirect ไป HTML จะพัง
 * ด้วย "Unexpected token '<'" (fetch ตาม redirect อัตโนมัติแล้วเจอ HTML แทน JSON)
 */
function deny(
  req: Parameters<Parameters<typeof auth>[0]>[0],
  pathname: string,
  fallbackPathname: string,
  status: 401 | 403
) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status });
  }
  return redirectTo(req, fallbackPathname);
}

export default auth((req) => {
  const pathname = stripBasePath(req.nextUrl.pathname);
  const isAuthed = !!req.auth;
  const role = req.auth?.user?.role;
  const status = req.auth?.user?.status;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth");

  if (isPublic) return NextResponse.next();

  if (!isAuthed) {
    return deny(req, pathname, "/login", 401);
  }

  if (status !== "active" && pathname !== "/pending-role") {
    return deny(req, pathname, "/pending-role", 403);
  }

  if (pathname.startsWith("/cat") && role !== "cat" && role !== "admin") {
    return deny(req, pathname, "/login", 403);
  }

  if (pathname.startsWith("/cam") && role !== "cam" && role !== "admin") {
    return deny(req, pathname, "/login", 403);
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return deny(req, pathname, "/login", 403);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
