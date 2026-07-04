import { createHash } from "crypto";
import { AIPACK_RUBRIC } from "./rubric";

/**
 * สร้าง prompt ร่วมสำหรับทุก AI provider — บังคับ evidence-first:
 * ต้องอ้างข้อความ+เลขหน้าเป็นหลักฐานทุกคะแนน ถ้าไม่พบให้ตอบ no_evidence=true
 * (ห้ามเดาคะแนนสูงเมื่อไม่มีหลักฐาน — ตาม SRS §3/AC-3)
 */
export function buildEvaluationPrompt(planText: string): string {
  const rubricText = AIPACK_RUBRIC.map(
    (c) =>
      `${c.code} — ${c.title}\n` +
      c.descriptors.map((d) => `  ระดับ ${d.level}: ${d.text}`).join("\n")
  ).join("\n\n");

  return `คุณเป็นผู้ช่วยประเมินแผนการจัดการเรียนรู้ตามกรอบ AIPACK สำหรับโครงการพัฒนา
ความฉลาดรู้ด้านการอ่าน (RL) และการคิดอย่างมีวิจารณญาณ (CT) จ.กาฬสินธุ์

หลักการสำคัญ (ต้องปฏิบัติตามเคร่งครัด):
1. ประเมินโดยอ้างอิงเฉพาะข้อความที่ปรากฏจริงในแผน (evidence-based) ห้ามคาดเดา
2. ทุกองค์ประกอบต้องมี "evidence" อย่างน้อย 1 รายการ (quote+page) หากพบหลักฐาน
3. ถ้าไม่พบหลักฐานเพียงพอสำหรับองค์ประกอบใด ให้ตอบ "no_evidence": true และให้ level ต่ำ (1)
   ห้ามให้คะแนนสูงจากการเดาหรือความน่าจะเป็นเด็ดขาด
4. ให้ "confidence" ตามความชัดเจนของหลักฐานที่พบ (high/medium/low)

เกณฑ์การให้คะแนน (AIPACK Rubric — 5 องค์ประกอบ, องค์ประกอบละ 1-4 คะแนน):
${rubricText}

แผนการจัดการเรียนรู้ (ข้อความที่สกัดได้):
"""
${planText}
"""

จงตอบกลับเป็น JSON ตามโครงสร้างนี้เท่านั้น (ไม่ต้องมีข้อความอื่นนอก JSON):
{
  "criteria": [
    {"code":"C1","level":1-4,"reason":"เหตุผลสั้น","evidence":[{"quote":"...","page":<number|null>}],"confidence":"high|medium|low","no_evidence":false},
    ... (C2..C5)
  ],
  "suggested_total": <ผลรวม 0-20>
}`;
}

/** hash ของ prompt — เก็บไว้เพื่อ reproducibility (audit ว่าประเมินด้วย prompt เวอร์ชันไหน) */
export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}
