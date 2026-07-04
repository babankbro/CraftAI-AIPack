import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/db";

/**
 * PrismaAdapter สร้าง User ก่อนที่จะรู้จัก providerAccountId (googleSub)
 * จึง wrap ให้ backfill googleSub ลง users หลัง linkAccount สำเร็จ (provider="google")
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
  };
}

/**
 * NextAuth v5 config — Google OAuth เป็นวิธีเดียว (SRS FR-1)
 * - basePath ของ mount path ถูกอนุมานจาก NEXTAUTH_URL (รวม /aipack) — ไม่ต้องตั้ง authConfig.basePath ซ้ำ
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: buildAdapter(),
  session: { strategy: "database" }, // มติ ③ — DB-backed session
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
