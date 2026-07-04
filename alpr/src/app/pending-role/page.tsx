import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function PendingRolePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status === "active") redirect("/");

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[color:var(--border-soft)] bg-white shadow-sm">
        ⏳
      </div>
      <h2 className="mt-5 text-2xl font-semibold">รอกำหนดบทบาท</h2>
      <p className="mt-2 text-sm text-muted">
        บัญชี <b>{session.user.email}</b> เข้าสู่ระบบสำเร็จแล้ว
        แต่ยังไม่ได้ถูกกำหนดบทบาท (ครูผู้สอน/ครูพี่เลี้ยง)
        โปรดติดต่อผู้ดูแลระบบเพื่อเปิดสิทธิ์การใช้งาน
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-6"
      >
        <button
          type="submit"
          className="rounded-xl border border-[color:var(--border)] bg-white px-5 py-2.5 text-sm font-semibold hover:bg-[#fafafa]"
        >
          ออกจากระบบ
        </button>
      </form>
    </main>
  );
}
