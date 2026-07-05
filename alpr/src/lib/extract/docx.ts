import mammoth from "mammoth";

export interface DocxExtractResult {
  text: string;
}

export async function extractDocx(buffer: Buffer): Promise<DocxExtractResult> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}

/**
 * แปลง DOCX เป็น HTML สำหรับพรีวิวในเว็บ (browser เปิด .docx เองไม่ได้)
 * mammoth คืน HTML พื้นฐาน (p/h/table/ul/img) ไม่มี script — ปลอดภัยพอสำหรับไฟล์ของเจ้าของเอง
 */
export async function docxToHtml(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}
