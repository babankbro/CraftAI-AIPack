import { PDFParse } from "pdf-parse";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pathToFileURL } from "url";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

/**
 * pdf-parse (ผ่าน pdfjs-dist) พยายาม auto-resolve path ของ pdf.worker.mjs เอง แต่ Next.js
 * (Turbopack) bundle ใหม่ทำให้ path ที่เดาไว้ผิด (หา chunk ไม่เจอ, throw "Setting up fake worker
 * failed") ต้องชี้ path ของ worker file บนดิสก์ตรง ๆ ผ่าน PDFParse.setWorker() แทน
 */
PDFParse.setWorker(
  pathToFileURL(join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")).href
);

/** จำนวนอักขระต่ำสุดต่อหน้าที่ถือว่า "มีข้อความดิจิทัลอยู่แล้ว" — ต่ำกว่านี้ถือว่าเป็นหน้าสแกน ต้อง OCR */
const MIN_TEXT_CHARS_PER_PAGE = 20;

export interface PdfExtractResult {
  text: string;
  pageCount: number;
  ocrUsed: boolean;
  pages: Array<{ num: number; text: string }>;
}

/** OCR ภาพหนึ่งหน้า (PNG buffer) ด้วย Tesseract CLI ภาษาไทย+อังกฤษ */
async function ocrImageBuffer(png: Uint8Array): Promise<string> {
  const tmpBase = join(tmpdir(), `alpr-ocr-${randomUUID()}`);
  const imgPath = `${tmpBase}.png`;
  await writeFile(imgPath, png);
  try {
    // tesseract <img> stdout -l tha+eng
    const { stdout } = await execFileAsync("tesseract", [
      imgPath,
      "stdout",
      "-l",
      "tha+eng",
    ]);
    return stdout.trim();
  } finally {
    await unlink(imgPath).catch(() => {});
  }
}

/**
 * สกัดข้อความจาก PDF — ใช้ข้อความดิจิทัลก่อน (pdf-parse)
 * หน้าใดข้อความน้อยเกินไป (สงสัยว่าเป็นภาพสแกน) จะ render เป็นภาพแล้ว OCR ภาษาไทยแทน (AC-1)
 */
export async function extractPdf(buffer: Buffer): Promise<PdfExtractResult> {
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    let ocrUsed = false;

    const pagesNeedingOcr = textResult.pages
      .filter((p) => p.text.trim().length < MIN_TEXT_CHARS_PER_PAGE)
      .map((p) => p.num);

    const finalPages = new Map<number, string>();
    for (const p of textResult.pages) finalPages.set(p.num, p.text);

    if (pagesNeedingOcr.length > 0) {
      const screenshotResult = await parser.getScreenshot({
        partial: pagesNeedingOcr,
        scale: 2,
      });
      for (const page of screenshotResult.pages) {
        const ocrText = await ocrImageBuffer(page.data);
        if (ocrText.length > 0) {
          finalPages.set(page.pageNumber, ocrText);
          ocrUsed = true;
        }
      }
    }

    const orderedEntries = Array.from(finalPages.entries()).sort(([a], [b]) => a - b);
    const orderedText = orderedEntries.map(([, t]) => t).join("\n\n");

    return {
      text: orderedText,
      pageCount: textResult.total,
      ocrUsed,
      pages: orderedEntries.map(([num, text]) => ({ num, text })),
    };
  } finally {
    await parser.destroy();
  }
}
