import Link from "next/link";
import { signOut } from "@/auth";

// next-auth ไม่รู้จัก Next.js basePath (ดูรายละเอียดใน src/auth.ts) — redirectTo ของ signOut()
// ต้องใส่ basePath เอง ไม่งั้นหลัง signOut จะ redirect ไปที่ "/login" (root) แล้ว 404
const BASE_PATH = process.env.BASE_PATH || "/aipack";

export function AppHeader({
  userName,
  roleLabel,
  isAdmin = false,
  isCam = false,
}: {
  userName: string;
  roleLabel: string;
  isAdmin?: boolean;
  isCam?: boolean;
}) {
  const initial = userName.trim().charAt(0) || "?";
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[color:var(--border)] bg-white/85 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-2.5 font-semibold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-sm text-white">
          A
        </span>
        AIPACK · DigiNest
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
          {roleLabel}
        </span>
      </div>
      <div className="flex items-center gap-2.5 text-sm">
        {isCam && (
          <Link
            href="/cam/queue"
            className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[#fafafa]"
          >
            คิวตรวจ
          </Link>
        )}
        {isAdmin && (
          <>
            <Link
              href="/admin/users"
              className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[#fafafa]"
            >
              จัดการผู้ใช้
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[#fafafa]"
            >
              ตั้งค่า AI
            </Link>
          </>
        )}
        <span>{userName}</span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft font-semibold text-primary">
          {initial}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: `${BASE_PATH}/login` });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[#fafafa]"
          >
            ออกจากระบบ
          </button>
        </form>
      </div>
    </header>
  );
}
