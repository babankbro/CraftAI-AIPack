import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { AIPACK_RUBRIC, PLC_ACTION } from "@/lib/ai/rubric";

const FONT_PATH =
  process.env.REPORT_FONT_PATH ||
  join(process.cwd(), "assets/fonts/IBMPlexSansThai-Regular.ttf");

export interface ReportData {
  subject: string;
  topic: string | null;
  grade: string | null;
  catName: string;
  camName: string;
  position: string | null;
  signedAt: Date;
  criteria: Array<{ code: string; level: number }>;
  total: number;
  band: string;
  plcAction: string | null;
  strengths: string | null;
  areasForGrowth: string | null;
}

const BAND_LABEL: Record<string, string> = {
  innovative_master: "ต้นแบบสร้างสรรค์ (Innovative Master)",
  fluent: "เชี่ยวชาญช่ำชอง (Fluent Practitioner)",
  developing: "บ่มเพาะทักษะ (Developing) — ⚠️ ห้ามใช้สอนทันที",
  emerging: "เริ่มจุดประกาย (Emerging)",
};

/**
 * สร้างรายงานผลประเมิน PDF ตามรูปแบบ "แบบประเมินแผนการจัดการเรียนรู้ AIPACK" ต้นฉบับ (ย่อ)
 * ⚠️ ต้องมีไฟล์ฟอนต์ไทยที่ assets/fonts/ ก่อนใช้งาน (ดู assets/fonts/README.md)
 */
export async function generateReportPdf(data: ReportData): Promise<Buffer> {
  if (!existsSync(FONT_PATH)) {
    throw new Error(
      `ไม่พบไฟล์ฟอนต์ไทยที่ ${FONT_PATH} — โปรดติดตั้งฟอนต์ก่อนสร้างรายงาน PDF (ดู assets/fonts/README.md)`
    );
  }
  const fontBytes = await readFile(FONT_PATH);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  let y = 800;
  const left = 50;
  const ink = rgb(0.12, 0.14, 0.2);
  const muted = rgb(0.42, 0.45, 0.5);

  const draw = (
    text: string,
    size = 11,
    color = ink,
    x = left,
    lineFont: PDFFont = font
  ) => {
    page.drawText(text, { x, y, size, font: lineFont, color });
  };
  const nl = (h = 16) => (y -= h);

  draw("แบบประเมินแผนการจัดการเรียนรู้แบบบูรณาการ AIPACK", 15);
  nl(22);
  draw("(รายงานผลจากระบบ ALPR — ยืนยันโดยครูพี่เลี้ยง)", 10, muted);
  nl(26);

  draw(`รายวิชา/เรื่องที่สอน: ${data.subject}${data.topic ? " — " + data.topic : ""}`);
  nl();
  draw(`ระดับชั้น: ${data.grade ?? "-"}`);
  nl();
  draw(`ครูผู้จัดทำแผน (CAT): ${data.catName}`);
  nl();
  draw(`ผู้ตรวจประเมิน (CAM): ${data.camName}${data.position ? " · " + data.position : ""}`);
  nl();
  draw(`วันที่ลงนาม: ${data.signedAt.toLocaleDateString("th-TH")}`);
  nl(28);

  draw("ส่วนที่ 2: คะแนนตามองค์ประกอบ AIPACK", 13);
  nl(22);
  for (const c of data.criteria) {
    const def = AIPACK_RUBRIC.find((r) => r.code === c.code);
    draw(`${c.code} ${def?.title ?? ""}  —  ระดับ ${c.level}/4`);
    nl();
  }
  nl(8);
  draw(`คะแนนรวม: ${data.total} / 20`, 13);
  nl(18);
  draw(`ระดับคุณภาพ: ${BAND_LABEL[data.band] ?? data.band}`, 12);
  nl(18);
  draw(`PLC Action: ${data.plcAction ?? PLC_ACTION[data.band as keyof typeof PLC_ACTION] ?? "-"}`, 10, muted);
  nl(30);

  draw("ส่วนที่ 4: ข้อเสนอแนะเพื่อการพัฒนา", 13);
  nl(20);
  draw("4.1 จุดเด่น (Strengths):", 11);
  nl(16);
  draw(data.strengths ?? "-", 10, muted);
  nl(24);
  draw("4.2 จุดเติมเต็ม (Areas for Growth):", 11);
  nl(16);
  draw(data.areasForGrowth ?? "-", 10, muted);
  nl(30);

  draw(`ลงชื่อผู้ตรวจประเมิน (CAM): ${data.camName}`, 10);

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
