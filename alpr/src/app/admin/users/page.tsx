import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { revalidatePath } from "next/cache";
import type { UserRole, UserStatus } from "@prisma/client";

const ROLE_LABEL: Record<UserRole, string> = {
  cat: "ครูผู้สอน (CAT)",
  cam: "ครูพี่เลี้ยง (CAM)",
  admin: "ผู้ดูแลระบบ (Admin)",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  active: "ใช้งานได้",
  pending_role: "รอกำหนดบทบาท",
  disabled: "ปิดการใช้งาน",
};

async function updateUserRoleStatus(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const role = String(formData.get("role")) as UserRole;
  const status = String(formData.get("status")) as UserStatus;
  await prisma.user.update({ where: { id }, data: { role, status } });
  revalidatePath("/admin/users");
}

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/login");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { school: { select: { name: true } } },
  });

  return (
    <>
      <AppHeader
        userName={session.user.name ?? session.user.email ?? ""}
        roleLabel="ผู้ดูแลระบบ"
        isAdmin
        isCam
      />
      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <h2 className="mb-1 text-2xl font-semibold">จัดการผู้ใช้และบทบาท</h2>
        <p className="mb-5 text-sm text-muted">
          ผู้ใช้ทั้งหมด {users.length} คน — กำหนด/แก้ไขบทบาท (ครูผู้สอน/ครูพี่เลี้ยง/ผู้ดูแลระบบ)
          และสถานะการใช้งาน
        </p>

        <div className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-white shadow-[var(--shadow-md)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border-soft)] bg-[#f7f8fa] text-left text-xs font-semibold text-muted">
                <th className="px-4 py-3">ผู้ใช้</th>
                <th className="px-4 py-3">โรงเรียน</th>
                <th className="px-4 py-3">บทบาท / สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[color:var(--border-soft)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{u.name}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{u.school?.name ?? "-"}</td>
                  <td className="p-0">
                    <form action={updateUserRoleStatus} className="flex items-center gap-2 px-4 py-2">
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="rounded-lg border border-[color:var(--border)] bg-white px-2 py-1.5 text-xs"
                      >
                        {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                      <select
                        name="status"
                        defaultValue={u.status}
                        className="rounded-lg border border-[color:var(--border)] bg-white px-2 py-1.5 text-xs"
                      >
                        {(Object.keys(STATUS_LABEL) as UserStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                      >
                        บันทึก
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
