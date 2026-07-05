import { createHash } from "crypto";
import { AIPACK_RUBRIC, type RubricCriterionDef } from "./rubric";

const PRINCIPLES = `หลักการสำคัญ (ต้องปฏิบัติตามเคร่งครัด):
1. ประเมินโดยอ้างอิงเฉพาะข้อความที่ปรากฏจริงในแผน (evidence-based) ห้ามคาดเดา
2. ต้องมี "evidence" (quote+page) ที่เป็นประโยค/ข้อความจริงจากแผน ซึ่งเป็นเหตุผลของระดับที่ให้
   ยก quote ให้ตรงคำที่สุด (คัดลอกจากแผน) และให้มากกว่า 1 รายการหากมีหลายจุดสนับสนุน
3. ถ้าไม่พบหลักฐานเพียงพอ ให้ "no_evidence": true และ level ต่ำ (1) ห้ามให้คะแนนสูงจากการเดา
4. "confidence" ตามความชัดเจนของหลักฐาน (high/medium/low)`;

/**
 * Prompt ประเมินเชิงลึก "รายองค์ประกอบ" (per-criterion iteration) — โฟกัส 1 C ต่อการเรียก
 * เพื่อให้ได้หลักฐาน (ประโยคที่ให้คะแนน) + คำแนะนำปรับปรุง + ตัวอย่างที่ละเอียดขึ้น
 */
export function buildCriterionPrompt(
  planText: string,
  criterion: RubricCriterionDef
): string {
  const descriptors = criterion.descriptors
    .map((d) => `  ระดับ ${d.level}: ${d.text}`)
    .join("\n");

  return `คุณเป็นผู้ช่วยประเมินแผนการจัดการเรียนรู้ตามกรอบ AIPACK สำหรับโครงการพัฒนา
ความฉลาดรู้ด้านการอ่าน (RL) และการคิดอย่างมีวิจารณญาณ (CT) จ.กาฬสินธุ์

${PRINCIPLES}

ให้ประเมิน "เฉพาะองค์ประกอบเดียว" ต่อไปนี้เท่านั้น อย่างละเอียดและเป็นกัลยาณมิตร:
${criterion.code} — ${criterion.title}
เกณฑ์ระดับ (1-4):
${descriptors}

แผนการจัดการเรียนรู้ (ข้อความที่สกัดได้):
"""
${planText}
"""

ภารกิจ:
1. ให้ "level" (1-4) ตามเกณฑ์ พร้อม "reason" อธิบายว่าทำไมจึงได้ระดับนี้ (เชื่อมโยงกับ evidence)
2. "evidence": ยกประโยค/ข้อความจริงจากแผนที่เป็นหลักฐานของระดับที่ให้ (quote ตรงคำ + เลขหน้า)
   — นี่คือ "จุดที่แสดงว่าทำไมให้คะแนนนี้"
3. "suggestions": คำแนะนำการปรับปรุงเชิงรูปธรรม 2-4 ข้อ (บอกให้ชัดว่าต้องเพิ่ม/แก้อะไรจึงจะขยับระดับขึ้น)
4. "example": ตัวอย่างที่เขียนให้เห็นภาพว่าเวอร์ชันที่ดีขึ้นควรมีหน้าตาแบบไหน
   โดยอิงเนื้อหาจริงของแผนนี้ (เช่น ตัวอย่างชุดคำถาม Socratic, ตัวอย่าง Prompt, ตัวอย่างเกณฑ์วัด)

ตอบกลับเป็น JSON object เท่านั้น (ไม่ต้องมีข้อความอื่นนอก JSON) ตามโครงสร้าง:
{
  "level": 1-4,
  "reason": "เหตุผลที่เชื่อมโยงกับหลักฐาน",
  "evidence": [{"quote":"ประโยคจริงจากแผน","page":<number|null>}],
  "confidence": "high|medium|low",
  "no_evidence": false,
  "suggestions": ["คำแนะนำข้อ 1","คำแนะนำข้อ 2"],
  "example": "ตัวอย่างที่เขียนให้ละเอียด อิงเนื้อหาแผนจริง"
}`;
}

/** hash ของ prompt — เก็บไว้เพื่อ reproducibility (audit ว่าประเมินด้วย prompt เวอร์ชันไหน) */
export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

/** รวม prompt รายองค์ประกอบทั้ง 5 เป็น hash เดียว (สำหรับเก็บ audit ต่อ 1 การประเมิน) */
export function buildAllCriterionPromptsHash(planText: string): string {
  const all = AIPACK_RUBRIC.map((c) => buildCriterionPrompt(planText, c)).join("\n---\n");
  return hashPrompt(all);
}
