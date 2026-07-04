import { extractPdf } from "./pdf";
import { extractDocx } from "./docx";
import { buildChecklist } from "./checklist";
import type { ChecklistItem } from "@/lib/ai/schema";

export interface ExtractResult {
  text: string;
  ocrUsed: boolean;
  pageCount: number | null;
  checklist: ChecklistItem[];
}

/** จุดเข้าเดียวสำหรับสกัดข้อความ — เลือกวิธีตามชนิดไฟล์ (M3) */
export async function extractPlanFile(
  buffer: Buffer,
  fileType: "pdf" | "docx"
): Promise<ExtractResult> {
  if (fileType === "pdf") {
    const r = await extractPdf(buffer);
    return {
      text: r.text,
      ocrUsed: r.ocrUsed,
      pageCount: r.pageCount,
      checklist: buildChecklist(r.text, r.pages),
    };
  }

  const r = await extractDocx(buffer);
  return {
    text: r.text,
    ocrUsed: false,
    pageCount: null,
    checklist: buildChecklist(r.text),
  };
}
