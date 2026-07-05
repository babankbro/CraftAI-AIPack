import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { revalidatePath } from "next/cache";
import type { AiProvider } from "@prisma/client";

const PROVIDER_LABEL: Record<AiProvider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI (ChatGPT)",
  claude: "Anthropic Claude",
};

async function updateAiSettings(formData: FormData) {
  "use server";
  const aiProvider = String(formData.get("aiProvider")) as AiProvider;
  const geminiModel = String(formData.get("geminiModel") || "").trim() || null;
  const openaiModel = String(formData.get("openaiModel") || "").trim() || null;

  await prisma.appSetting.upsert({
    where: { id: 1 },
    create: { id: 1, aiProvider, geminiModel, openaiModel },
    update: { aiProvider, geminiModel, openaiModel },
  });
  revalidatePath("/admin/settings");
}

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/login");

  const settings = await prisma.appSetting.findUnique({ where: { id: 1 } });
  const currentProvider = settings?.aiProvider ?? "gemini";

  return (
    <>
      <AppHeader
        userName={session.user.name ?? session.user.email ?? ""}
        roleLabel="ผู้ดูแลระบบ"
        isAdmin
        isCam
      />
      <main className="mx-auto max-w-[820px] px-6 py-8">
        <h2 className="mb-1 text-2xl font-semibold">ตั้งค่า AI Evaluator</h2>
        <p className="mb-5 text-sm text-muted">
          เลือกผู้ให้บริการ AI และรุ่นโมเดลที่ใช้ประเมินแผนการสอน — มีผลทันทีกับแผนที่อัปโหลดใหม่
          โดยไม่ต้อง restart ระบบ (ถ้าปล่อยช่องรุ่นโมเดลว่างไว้ จะใช้ค่าเริ่มต้นจาก environment variable)
        </p>

        <form
          action={updateAiSettings}
          className="flex flex-col gap-5 rounded-2xl border border-[color:var(--border-soft)] bg-white p-6 shadow-[var(--shadow-md)]"
        >
          <div>
            <label className="mb-1.5 block text-sm font-semibold">ผู้ให้บริการ AI (Provider)</label>
            <div className="flex gap-3">
              {(Object.keys(PROVIDER_LABEL) as AiProvider[])
                .filter((p) => p !== "claude") // ยังไม่มี AiEvaluator implementation ให้ Claude
                .map((p) => (
                  <label
                    key={p}
                    className={`flex-1 cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold ${
                      currentProvider === p
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-[color:var(--border)] bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="aiProvider"
                      value={p}
                      defaultChecked={currentProvider === p}
                      className="mr-2"
                    />
                    {PROVIDER_LABEL[p]}
                  </label>
                ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">รุ่นโมเดล Gemini</label>
            <input
              name="geminiModel"
              defaultValue={settings?.geminiModel ?? ""}
              placeholder="เช่น gemini-2.5-pro, gemini-2.5-flash (ว่าง = ใช้ค่าจาก .env)"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3.5 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">รุ่นโมเดล OpenAI</label>
            <input
              name="openaiModel"
              defaultValue={settings?.openaiModel ?? ""}
              placeholder="เช่น gpt-5.5-pro, gpt-4o-mini (ว่าง = ใช้ค่าจาก .env)"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3.5 py-3 text-sm"
            />
            <p className="mt-1.5 text-xs text-muted">
              หมายเหตุ: ต้องมี OPENAI_API_KEY ที่ตั้งค่าไว้ใน .env และบัญชี OpenAI ต้องมี billing/quota
              เปิดใช้งานอยู่ ไม่เช่นนั้นจะได้ error &quot;insufficient_quota&quot; แม้ตั้งรุ่นโมเดลถูกต้อง
            </p>
          </div>

          <button
            type="submit"
            className="self-start rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(69,92,161,.28)] hover:bg-primary-hover"
          >
            บันทึกการตั้งค่า
          </button>
        </form>
      </main>
    </>
  );
}
