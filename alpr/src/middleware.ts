import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * RBAC middleware — กันเส้นทาง CAT/CAM ตามบทบาท (SRS FR-1.2/1.3)
 * หมายเหตุ: request.nextUrl.pathname ไม่รวม basePath (Next.js ตัดให้แล้ว)
 * จึงเขียน path เทียบตรง ๆ โดยไม่ต้องใส่ /aipack เอง
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;
  const role = req.auth?.user?.role;
  const status = req.auth?.user?.status;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth");

  if (isPublic) return NextResponse.next();

  if (!isAuthed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (status !== "active" && pathname !== "/pending-role") {
    return NextResponse.redirect(new URL("/pending-role", req.url));
  }

  if (pathname.startsWith("/cat") && role !== "cat" && role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/cam") && role !== "cam" && role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
