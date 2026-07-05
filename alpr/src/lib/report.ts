import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { AIPACK_RUBRIC, PLC_ACTION } from "@/lib/ai/rubric";

const FONT_PATH =
  process.env.REPORT_FONT_PATH ||
  join(process.cwd(), "assets/fonts/IBMPlexSansThai-Regular.ttf");
const FONT_BOLD_PATH =
  process.env.REPORT_FONT_BOLD_PATH ||
  join(process.cwd(), "assets/fonts/IBMPlexSansThai-Bold.ttf");

export interface AiCriterionInput {
  code: string;
  level: number;
  reason: string;
  confidence: string;
  no_evidence: boolean;
  evidence: Array<{ quote: string; page: number | null }>;
}

export interface ReportData {
  subject: string;
  topic: string | null;
  grade: string | null;
  catName: string;
  camName: string;
  position: string | null;
  signedAt: Date;
  criteria: Array<{ code: string; level: number; reason?: string }>;
  /** ผล AI ดั้งเดิม (ก่อน CAM ยืนยัน/แก้) — แสดงเทียบข้าง ๆ กันในรายงาน */
  aiCriteria?: AiCriterionInput[];
  total: number;
  band: string;
  plcAction: string | null;
  strengths: string | null;
  areasForGrowth: string | null;
}

const BAND_LABEL: Record<string, string> = {
  innovative_master: "ต้นแบบสร้างสรรค์ (Innovative Master)",
  fluent: "เชี่ยวชาญช่ำชอง (Fluent Practitioner)",
  developing: "บ่มเพาะทักษะ (Developing) — ห้ามใช้สอนทันที",
  emerging: "เริ่มจุดประกาย (Emerging)",
};

const BAND_COLOR: Record<string, { bg: RGB; text: RGB }> = {
  innovative_master: { bg: rgb(0.85, 0.95, 0.88), text: rgb(0.09, 0.47, 0.26) },
  fluent: { bg: rgb(0.87, 0.9, 0.98), text: rgb(0.22, 0.32, 0.65) },
  developing: { bg: rgb(0.99, 0.9, 0.82), text: rgb(0.7, 0.28, 0.06) },
  emerging: { bg: rgb(0.99, 0.85, 0.85), text: rgb(0.75, 0.15, 0.15) },
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "สูง",
  medium: "กลาง",
  low: "ต่ำ",
};

// ── หน้ากระดาษ A4 + margin ──
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 46;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 50;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const INK = rgb(0.12, 0.14, 0.2);
const MUTED = rgb(0.44, 0.47, 0.53);
const BORDER = rgb(0.85, 0.86, 0.9);
const PANEL_BG = rgb(0.97, 0.975, 0.985);
const PRIMARY = rgb(0.25, 0.3, 0.6);
const PRIMARY_SOFT = rgb(0.91, 0.92, 0.97);
const WHITE = rgb(1, 1, 1);
const SUCCESS_BG = rgb(0.88, 0.96, 0.9);
const SUCCESS_TEXT = rgb(0.11, 0.5, 0.27);
const WARN_BG = rgb(0.99, 0.9, 0.82);
const WARN_TEXT = rgb(0.7, 0.28, 0.06);

/** ตัดบรรทัดตามความกว้างจริงของฟอนต์ — ตัดทีละตัวอักษร (ไทยไม่มีช่องว่างระหว่างคำ) */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [];
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const ch of paragraph) {
      const candidate = line + ch;
      if (line.length > 0 && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line);
        line = ch;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

interface Cursor {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
}

function addPage(doc: PDFDocument): PDFPage {
  return doc.addPage([PAGE_W, PAGE_H]);
}

function ensureSpace(cursor: Cursor, needed: number) {
  if (cursor.y - needed < MARGIN_BOTTOM) {
    cursor.page = addPage(cursor.doc);
    cursor.y = PAGE_H - MARGIN_TOP;
  }
}

function measureParagraph(
  text: string,
  font: PDFFont,
  size: number,
  lineHeight: number,
  maxWidth: number
): { lines: string[]; height: number } {
  const lines = wrapText(text, font, size, maxWidth);
  return { lines, height: lines.length * lineHeight };
}

function drawParagraph(
  cursor: Cursor,
  text: string,
  opts: {
    size?: number;
    color?: RGB;
    font?: PDFFont;
    lineHeight?: number;
    maxWidth?: number;
    x?: number;
  } = {}
) {
  const {
    size = 10,
    color = MUTED,
    font = cursor.font,
    lineHeight = size * 1.5,
    maxWidth = CONTENT_W,
    x = MARGIN_X,
  } = opts;
  const { lines } = measureParagraph(text, font, size, lineHeight, maxWidth);
  for (const line of lines) {
    cursor.page.drawText(line, { x, y: cursor.y - size, size, font, color });
    cursor.y -= lineHeight;
  }
}

function drawLine(
  cursor: Cursor,
  text: string,
  opts: { size?: number; color?: RGB; font?: PDFFont; x?: number; advance?: number } = {}
) {
  const { size = 11, color = INK, font = cursor.font, x = MARGIN_X, advance = size * 1.5 } = opts;
  cursor.page.drawText(text, { x, y: cursor.y - size, size, font, color });
  cursor.y -= advance;
}

/** วาดกล่องพื้นหลัง/เส้นขอบ ย้อนขึ้นจาก cursor.y ปัจจุบันสูง `height` (ไม่ขยับ cursor) */
function drawPanel(
  cursor: Cursor,
  height: number,
  opts: { fill?: RGB; border?: RGB; x?: number; width?: number } = {}
) {
  const { fill, border, x = MARGIN_X, width = CONTENT_W } = opts;
  cursor.page.drawRectangle({
    x,
    y: cursor.y - height,
    width,
    height,
    color: fill,
    borderColor: border,
    borderWidth: border ? 1 : 0,
  });
}

function drawPill(
  page: PDFPage,
  text: string,
  x: number,
  yTop: number,
  font: PDFFont,
  size: number,
  colors: { bg: RGB; text: RGB }
): number {
  const paddingX = 8;
  const height = size + 8;
  const width = font.widthOfTextAtSize(text, size) + paddingX * 2;
  page.drawRectangle({ x, y: yTop - height, width, height, color: colors.bg });
  page.drawText(text, {
    x: x + paddingX,
    y: yTop - height + 5,
    size,
    font,
    color: colors.text,
  });
  return width;
}

/**
 * สร้างรายงานผลประเมิน PDF ตามรูปแบบ "แบบประเมินแผนการจัดการเรียนรู้ AIPACK" ต้นฉบับ
 * แสดงผลเทียบ AI เสนอ vs CAM ยืนยัน รายองค์ประกอบ พร้อมเหตุผลของทั้งสองฝ่าย
 * ⚠️ ต้องมีไฟล์ฟอนต์ไทยที่ assets/fonts/ ก่อนใช้งาน (ดู assets/fonts/README.md)
 */
export async function generateReportPdf(data: ReportData): Promise<Buffer> {
  if (!existsSync(FONT_PATH)) {
    throw new Error(
      `ไม่พบไฟล์ฟอนต์ไทยที่ ${FONT_PATH} — โปรดติดตั้งฟอนต์ก่อนสร้างรายงาน PDF (ดู assets/fonts/README.md)`
    );
  }
  const fontBytes = await readFile(FONT_PATH);
  const boldBytes = existsSync(FONT_BOLD_PATH) ? await readFile(FONT_BOLD_PATH) : fontBytes;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const bold = await pdfDoc.embedFont(boldBytes, { subset: true });

  const cursor: Cursor = { doc: pdfDoc, page: addPage(pdfDoc), y: PAGE_H, font, bold };

  // ── ป้ายหัวเรื่อง (สีพื้นเต็มความกว้าง) ──
  const headerHeight = 78;
  cursor.page.drawRectangle({ x: 0, y: PAGE_H - headerHeight, width: PAGE_W, height: headerHeight, color: PRIMARY });
  cursor.page.drawText("แบบประเมินแผนการจัดการเรียนรู้แบบบูรณาการ AIPACK", {
    x: MARGIN_X,
    y: PAGE_H - 34,
    size: 16,
    font: bold,
    color: WHITE,
  });
  cursor.page.drawText("รายงานผลจากระบบ ALPR — ยืนยันโดยครูพี่เลี้ยง (CAM)", {
    x: MARGIN_X,
    y: PAGE_H - 54,
    size: 10,
    font,
    color: rgb(0.9, 0.91, 0.98),
  });
  cursor.y = PAGE_H - headerHeight - 24;

  // ── ส่วนที่ 1: ข้อมูลทั่วไป ──
  drawLine(cursor, "ส่วนที่ 1: ข้อมูลทั่วไป", { size: 13, font: bold, advance: 20 });
  const infoPanelHeight = 88;
  drawPanel(cursor, infoPanelHeight, { fill: PANEL_BG, border: BORDER });
  {
    const padTop = 16;
    const padX = 16;
    const rowH = 18;
    const col2X = MARGIN_X + CONTENT_W / 2;
    let rowY = cursor.y - padTop;
    const rowText = (label: string, value: string, x: number) => {
      cursor.page.drawText(`${label}:`, { x, y: rowY - 10, size: 9.5, font: bold, color: MUTED });
      cursor.page.drawText(value, {
        x: x + font.widthOfTextAtSize(`${label}: `, 9.5) + 2,
        y: rowY - 10,
        size: 9.5,
        font,
        color: INK,
      });
    };
    rowText("รายวิชา/เรื่อง", `${data.subject}${data.topic ? " — " + data.topic : ""}`, MARGIN_X + padX);
    rowText("ระดับชั้น", data.grade ?? "-", col2X);
    rowY -= rowH;
    rowText("ครูผู้จัดทำแผน (CAT)", data.catName, MARGIN_X + padX);
    rowText("วันที่ลงนาม", data.signedAt.toLocaleDateString("th-TH"), col2X);
    rowY -= rowH;
    rowText(
      "ผู้ตรวจประเมิน (CAM)",
      `${data.camName}${data.position ? " · " + data.position : ""}`,
      MARGIN_X + padX
    );
  }
  cursor.y -= infoPanelHeight + 22;

  // ── ส่วนที่ 2: คะแนนรวมและระดับคุณภาพ ──
  drawLine(cursor, "ส่วนที่ 2: คะแนนตามองค์ประกอบ AIPACK", { size: 13, font: bold, advance: 20 });
  const bandColors = BAND_COLOR[data.band] ?? BAND_COLOR.emerging;
  const summaryHeight = 64;
  drawPanel(cursor, summaryHeight, { fill: PANEL_BG, border: BORDER });
  {
    const top = cursor.y;
    cursor.page.drawText(`${data.total}`, { x: MARGIN_X + 16, y: top - 44, size: 30, font: bold, color: INK });
    const totalW = bold.widthOfTextAtSize(`${data.total}`, 30);
    cursor.page.drawText("/20", {
      x: MARGIN_X + 16 + totalW + 4,
      y: top - 40,
      size: 14,
      font,
      color: MUTED,
    });
    drawPill(cursor.page, BAND_LABEL[data.band] ?? data.band, MARGIN_X + 130, top - 20, bold, 9.5, bandColors);
    const plcText = data.plcAction ?? PLC_ACTION[data.band as keyof typeof PLC_ACTION] ?? "-";
    const plcLines = wrapText(plcText, font, 8.5, CONTENT_W - 150);
    plcLines.slice(0, 2).forEach((line, i) => {
      cursor.page.drawText(line, { x: MARGIN_X + 130, y: top - 40 - i * 12, size: 8.5, font, color: MUTED });
    });
  }
  cursor.y -= summaryHeight + 20;

  // ── ตารางเปรียบเทียบรายองค์ประกอบ: AI เสนอ vs CAM ยืนยัน ──
  for (const def of AIPACK_RUBRIC) {
    const camScore = data.criteria.find((c) => c.code === def.code);
    const aiScore = data.aiCriteria?.find((c) => c.code === def.code);

    const camReasonText = camScore?.reason?.trim() || "";
    const aiReasonText = aiScore ? aiScore.reason : "";

    const lineHeight = 12.5;
    const aiMeasure = aiReasonText
      ? measureParagraph(aiReasonText, font, 9, lineHeight, CONTENT_W - 32)
      : { lines: [], height: 0 };
    const camMeasure = camReasonText
      ? measureParagraph(camReasonText, font, 9, lineHeight, CONTENT_W - 32)
      : { lines: [], height: 0 };

    const headerRowH = 26;
    const aiLabelH = aiScore ? 14 + aiMeasure.height + 6 : 0;
    const camLabelH = 14 + (camMeasure.height || lineHeight) + 6;
    const cardPadding = 16;
    const cardHeight = headerRowH + aiLabelH + camLabelH + cardPadding;

    ensureSpace(cursor, cardHeight + 12);
    const cardTop = cursor.y;
    drawPanel(cursor, cardHeight, { fill: WHITE, border: BORDER });

    // แถบหัวข้อ + badge คะแนน
    cursor.page.drawText(`${def.code}`, {
      x: MARGIN_X + 14,
      y: cardTop - 22,
      size: 11,
      font: bold,
      color: PRIMARY,
    });
    const codeW = bold.widthOfTextAtSize(def.code, 11);
    cursor.page.drawText(def.title, {
      x: MARGIN_X + 14 + codeW + 8,
      y: cardTop - 22,
      size: 10.5,
      font,
      color: INK,
    });

    let badgeX = PAGE_W - MARGIN_X - 14;
    if (aiScore) {
      const label = aiScore.no_evidence ? "AI: ไม่พบหลักฐาน" : `AI เสนอ: ระดับ ${aiScore.level}`;
      const w = bold.widthOfTextAtSize(label, 8.5) + 16;
      badgeX -= w;
      drawPill(cursor.page, label, badgeX, cardTop - 12, bold, 8.5, {
        bg: PRIMARY_SOFT,
        text: PRIMARY,
      });
      badgeX -= 6;
    }
    if (camScore) {
      const label = `CAM ยืนยัน: ระดับ ${camScore.level}`;
      const w = bold.widthOfTextAtSize(label, 8.5) + 16;
      badgeX -= w;
      drawPill(cursor.page, label, badgeX, cardTop - 12, bold, 8.5, {
        bg: SUCCESS_BG,
        text: SUCCESS_TEXT,
      });
    }

    cursor.y = cardTop - headerRowH;

    if (aiScore) {
      const confLabel = CONFIDENCE_LABEL[aiScore.confidence] ?? aiScore.confidence;
      drawLine(cursor, `เหตุผลของ AI (ความเชื่อมั่น: ${confLabel})`, {
        size: 8.5,
        font: bold,
        color: MUTED,
        x: MARGIN_X + 16,
        advance: 13,
      });
      drawParagraph(cursor, aiReasonText || "-", { size: 9, x: MARGIN_X + 16, lineHeight, maxWidth: CONTENT_W - 32 });
      cursor.y -= 6;
    }

    drawLine(cursor, "เหตุผลเพิ่มเติมของ CAM", {
      size: 8.5,
      font: bold,
      color: MUTED,
      x: MARGIN_X + 16,
      advance: 13,
    });
    drawParagraph(cursor, camReasonText || "— (ไม่มีบันทึกเพิ่มเติม)", {
      size: 9,
      x: MARGIN_X + 16,
      lineHeight,
      maxWidth: CONTENT_W - 32,
    });

    cursor.y = cardTop - cardHeight - 12;
  }

  cursor.y -= 8;

  // ── ส่วนที่ 4: ข้อเสนอแนะเพื่อการพัฒนา ──
  ensureSpace(cursor, 40);
  drawLine(cursor, "ส่วนที่ 4: ข้อเสนอแนะเพื่อการพัฒนา", { size: 13, font: bold, advance: 20 });

  const strengthsText = data.strengths?.trim() || "-";
  const growthText = data.areasForGrowth?.trim() || "-";
  const sLineH = 12.5;
  const sMeasure = measureParagraph(strengthsText, font, 9.5, sLineH, CONTENT_W - 32);
  const gMeasure = measureParagraph(growthText, font, 9.5, sLineH, CONTENT_W - 32);

  const strengthsPanelH = 30 + sMeasure.height;
  ensureSpace(cursor, strengthsPanelH + 10);
  {
    const top = cursor.y;
    drawPanel(cursor, strengthsPanelH, { fill: SUCCESS_BG });
    cursor.page.drawText("จุดเด่น (Strengths)", { x: MARGIN_X + 14, y: top - 18, size: 10, font: bold, color: SUCCESS_TEXT });
    cursor.y = top - 30;
    drawParagraph(cursor, strengthsText, { size: 9.5, x: MARGIN_X + 14, lineHeight: sLineH, color: rgb(0.2, 0.35, 0.25), maxWidth: CONTENT_W - 32 });
    cursor.y = top - strengthsPanelH - 12;
  }

  const growthPanelH = 30 + gMeasure.height;
  ensureSpace(cursor, growthPanelH + 10);
  {
    const top = cursor.y;
    drawPanel(cursor, growthPanelH, { fill: PRIMARY_SOFT });
    cursor.page.drawText("จุดเติมเต็ม (Areas for Growth)", { x: MARGIN_X + 14, y: top - 18, size: 10, font: bold, color: PRIMARY });
    cursor.y = top - 30;
    drawParagraph(cursor, growthText, { size: 9.5, x: MARGIN_X + 14, lineHeight: sLineH, color: rgb(0.24, 0.27, 0.45), maxWidth: CONTENT_W - 32 });
    cursor.y = top - growthPanelH - 20;
  }

  // ── ลายเซ็น ──
  ensureSpace(cursor, 40);
  cursor.page.drawLine({
    start: { x: MARGIN_X, y: cursor.y },
    end: { x: MARGIN_X + 220, y: cursor.y },
    thickness: 0.8,
    color: BORDER,
  });
  cursor.y -= 16;
  drawLine(cursor, `ลงชื่อผู้ตรวจประเมิน (CAM): ${data.camName}`, { size: 10, font: bold });
  if (data.position) {
    drawLine(cursor, `ตำแหน่ง: ${data.position}`, { size: 9, color: MUTED, advance: 14 });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
