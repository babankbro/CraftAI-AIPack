import type { ChecklistItem } from "@/lib/ai/schema";

/**
 * เช็กลิสต์หลักฐาน 5 รายการ (SRS §3 Pre-flight Evidence Signals)
 * ตรวจแบบ heuristic (keyword) ก่อนส่งเข้า AI — ใช้เป็นสัญญาณเบื้องต้นให้ CAM เห็นเร็ว
 * ไม่ใช่คะแนนตัดสิน — คะแนนจริงมาจาก AI + CAM ยืนยัน
 */
const KEYWORDS: Record<ChecklistItem["key"], string[]> = {
  ai_tool: ["ai", "ปัญญาประดิษฐ์", "kapibarian", "chatgpt", "gemini", "generative ai"],
  prompt: ["prompt", "ชุดคำสั่ง", "พร้อมท์"],
  socratic: ["socratic", "โสกราตีส", "คำถามปลายเปิด", "คำถามปลายเปิดระดับสูง"],
  rubric: ["analytic rubric", "รูบริค", "เกณฑ์การประเมินแบบแยกองค์ประกอบ", "รูบริกส์"],
  think_trail: ["thinking trail", "ร่องรอยการคิด", "ร่องรอยความคิด"],
};

export interface PageTextHint {
  num: number;
  text: string;
}

export function buildChecklist(
  fullText: string,
  pages?: PageTextHint[]
): ChecklistItem[] {
  const lowerFull = fullText.toLowerCase();

  return (Object.keys(KEYWORDS) as ChecklistItem["key"][]).map((key) => {
    const terms = KEYWORDS[key];
    const found = terms.some((t) => lowerFull.includes(t.toLowerCase()));

    let page: number | null = null;
    if (found && pages?.length) {
      const hit = pages.find((p) =>
        terms.some((t) => p.text.toLowerCase().includes(t.toLowerCase()))
      );
      page = hit?.num ?? null;
    }

    return { key, found, page };
  });
}
