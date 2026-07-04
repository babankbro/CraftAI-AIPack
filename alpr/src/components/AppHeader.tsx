import { signOut } from "@/auth";

export function AppHeader({
  userName,
  roleLabel,
}: {
  userName: string;
  roleLabel: string;
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
        <span>{userName}</span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft font-semibold text-primary">
          {initial}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
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
