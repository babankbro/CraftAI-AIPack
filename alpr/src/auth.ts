import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/db";

/**
 * PrismaAdapter สร้าง User ก่อนที่จะรู้จัก providerAccountId (googleSub)
 * จึง wrap ให้ backfill googleSub ลง users หลัง linkAccount สำเร็จ (provider="google")
 *
 * นอกจากนี้ต้อง wrap createUser/updateUser ด้วย: PrismaAdapter มาตรฐานส่ง field
 * `image` และ `emailVerified` ตรง ๆ ให้ prisma.user.create/update — แต่ schema ของเรา
 * ไม่มี `emailVerified` (ไม่ใช้ email verification flow) และเก็บรูปโปรไฟล์เป็น `avatarUrl`
 * แทน `image` (ชื่อมาตรฐานของ Auth.js) จึงเกิด Prisma "Unknown argument" ถ้าไม่แปลงชื่อ field ก่อน
 */
function buildAdapter(): Adapter {
  const base = PrismaAdapter(prisma);
  return {
    ...base,
    async linkAccount(account) {
      await base.linkAccount!(account);
      if (account.provider === "google") {
        await prisma.user.update({
          where: { id: account.userId },
          data: { googleSub: account.providerAccountId },
        });
      }
    },
    async createUser({ image, email, name }) {
      // นโยบายเริ่มต้น (FR-1.1.4): บัญชีใหม่เป็น CAT + active ทันที ไม่ต้องรอ admin กำหนดบทบาท
      // ยกเว้นอีเมลใน ADMIN_EMAILS ที่ยกระดับเป็น admin ตั้งแต่สร้างบัญชี
      const isAdmin = isAdminEmail(email);
      const created = await prisma.user.create({
        data: {
          email,
          name: name ?? email,
          avatarUrl: image,
          role: isAdmin ? "admin" : "cat",
          status: "active",
        },
      });
      return { ...created, image: created.avatarUrl, emailVerified: null };
    },
    async updateUser({ id, image, email, name }) {
      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(email !== undefined ? { email } : {}),
          ...(name !== undefined && name !== null ? { name } : {}),
          ...(image !== undefined ? { avatarUrl: image } : {}),
        },
      });
      return { ...updated, image: updated.avatarUrl, emailVerified: null };
    },
  };
}

/**
 * NextAuth v5 config — Google OAuth เป็นวิธีเดียว (SRS FR-1)
 *
 * เรื่อง basePath (verified ด้วย runtime test, Next.js 16.2.9 + next-auth 5 beta):
 * - authConfig.basePath (internal prefix ของ @auth/core ที่ใช้ parse action จาก request path
 *   เช่น /providers, /callback/google — และใช้สร้าง URL ขาออกอย่าง redirect_uri ไป Google ด้วย)
 *   ถูกอนุมานจาก pathname ของ NEXTAUTH_URL (ดู next-auth/lib/env.js) — ต้องตั้งเป็น
 *   "<origin><basePath>/api/auth" ตรง ๆ (เช่น http://host/aipack/api/auth) ไม่ใช่แค่ root
 * - แต่ Next.js เวอร์ชันนี้ตัด basePath ("/aipack") ออกจาก req.url ก่อนส่งถึง Route Handler แล้ว
 *   (ต่างจาก Proxy/middleware ที่ nextUrl.pathname ยังมี basePath ติดอยู่ — คนละพฤติกรรมกัน)
 *   ทำให้ pathname ที่ @auth/core เห็นจริง ("/api/auth/...") สั้นกว่า config.basePath ที่ตั้งไว้
 *   ("/aipack/api/auth/...") หนึ่งช่วงเสมอ → ต้องเติม "/aipack" กลับเข้าไปเองใน
 *   [src/app/api/auth/[...nextauth]/route.ts](../src/app/api/auth/[...nextauth]/route.ts)
 *   ก่อนส่งต่อให้ handlers.GET/POST ไม่งั้นทุก action จะ throw UnknownAction และ
 *   redirect_uri ที่ส่งให้ Google จะขาด /aipack (Google จะปฏิเสธด้วย redirect_uri_mismatch)
 * - trustHost: true จำเป็นเมื่อรันหลัง reverse proxy (NFR-9.7) — Auth.js v5 ปฏิเสธ host ที่ไม่รู้จักใน
 *   production โดยดีฟอลต์ (UntrustedHost) แม้ค่า Host header จะตรงกับ NEXTAUTH_URL ก็ตาม
 *
 * - Session แบบ DB-backed (มติ ③) ผ่าน PrismaAdapter → เพิกถอนได้ทันที
 * - Google ให้แค่ "ตัวตน" — role/status ระบบเป็นผู้กำหนด (ไม่ได้มาจาก Google)
 */

const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

function isEmailAllowed(email: string): boolean {
  if (allowedDomains.length === 0) return true; // ไม่ตั้งค่า = ไม่จำกัด (dev only)
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && allowedDomains.includes(domain);
}

/**
 * รายชื่ออีเมล admin (comma-separated) — ล็อกอินด้วยอีเมลนี้จะถูกยกระดับเป็น role=admin
 * เสมอ (ทั้งตอนสร้างบัญชีครั้งแรกและทุกครั้งที่ล็อกอินซ้ำ กันกรณีถูกเปลี่ยนบทบาทผิดพลาดใน DB)
 */
const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email: string): boolean {
  return adminEmails.includes(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: buildAdapter(),
  session: { strategy: "database" }, // มติ ③ — DB-backed session
  // จำเป็นเมื่อรันหลัง reverse proxy (NFR-9.7) — Auth.js v5 ปฏิเสธ host ที่ไม่รู้จักใน
  // production โดยดีฟอลต์ (UntrustedHost) แม้ค่า Host header จะตรงกับ NEXTAUTH_URL ก็ตาม
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // FR-1.1.3 — จำกัดโดเมนอีเมล (allow-list)
    async signIn({ user }) {
      if (!user.email || !isEmailAllowed(user.email)) {
        return false; // ปฏิเสธ ไม่สร้าง session (AC-11)
      }
      // ยกระดับเป็น admin ทุกครั้งที่ล็อกอิน (ไม่ใช่แค่ตอนสร้างบัญชี) เผื่อ role ถูกแก้ไขผิดพลาดใน DB
      if (user.id && isAdminEmail(user.email)) {
        await prisma.user.updateMany({
          where: { id: user.id },
          data: { role: "admin", status: "active" },
        });
      }
      return true;
    },
    // ฝัง role/status/schoolId ลง session เพื่อใช้ตัดสิน RBAC ที่ middleware/pages
    async session({ session, user }) {
      const u = user as unknown as {
        role?: "cat" | "cam" | "admin";
        status?: "active" | "pending_role" | "disabled";
      };
      if (session.user) {
        session.user.id = user.id;
        session.user.role = u.role ?? "cat";
        session.user.status = u.status ?? "pending_role";
      }
      return session;
    },
  },
});
