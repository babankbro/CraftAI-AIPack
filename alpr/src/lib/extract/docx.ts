import mammoth from "mammoth";

export interface DocxExtractResult {
  text: string;
}

export async function extractDocx(buffer: Buffer): Promise<DocxExtractResult> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value };
}
