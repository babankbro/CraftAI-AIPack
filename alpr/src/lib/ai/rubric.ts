/**
 * เกณฑ์ AIPACK 5 องค์ประกอบ (rubric-version: aipack-v1)
 * อ้างอิง: assessment_forms_reference.md / SRS §3 (C1–C5)
 * ใช้ร่วมกันทั้งฝั่ง prompt (ส่งให้ AI), seed (บันทึกลง DB), และ UI
 */
export const RUBRIC_VERSION_CODE = "aipack-v1";

export interface RubricDescriptor {
  level: 1 | 2 | 3 | 4;
  text: string;
}

export interface RubricCriterionDef {
  code: "C1" | "C2" | "C3" | "C4" | "C5";
  title: string;
  descriptors: RubricDescriptor[];
  signals?: string[]; // เช็กลิสต์หลักฐานที่เกี่ยวข้อง
}

export const AIPACK_RUBRIC: RubricCriterionDef[] = [
  {
    code: "C1",
    title: "ความสอดคล้องกับมาตรฐาน (Alignment)",
    signals: ["ai_tool"],
    descriptors: [
      { level: 4, text: "เชื่อมโยง CK(ตัวชี้วัด) ↔ RL/CT ↔ AIK(การใช้ AI) ชัดเจนกลมกลืน" },
      { level: 3, text: "ระบุ CK + RL/CT แต่เชื่อมกับ AI ไม่ชัด" },
      { level: 2, text: "ระบุ CK ปกติ กล่าวถึง RL/CT/AI ผิวเผิน" },
      { level: 1, text: "มีแต่ CK ดั้งเดิม ไม่กล่าวถึง RL/CT/เทคโนโลยี" },
    ],
  },
  {
    code: "C2",
    title: "จุดประสงค์การเรียนรู้ (Objectives)",
    descriptors: [
      { level: 4, text: "K-P-A ครบ, พฤติกรรม SMART วัดได้, เจาะจง RL/CT, เจตคติ Growth Mindset/จริยธรรม AI" },
      { level: 3, text: "K-P-A ครบ ระบุทักษะคิด/อ่าน แต่ใช้คำกริยาวัดยาก (\"เข้าใจ\", \"ตระหนัก\")" },
      { level: 2, text: "เน้น K + P พื้นฐาน ไม่เจาะจง RL/CT" },
      { level: 1, text: "กว้างเกินไป วัดผลไม่ได้" },
    ],
  },
  {
    code: "C3",
    title: "กระบวนการจัดการเรียนรู้ (Process)",
    signals: ["socratic"],
    descriptors: [
      { level: 4, text: "เขียนชุดคำถาม Socratic ในขั้นตอนชัด + กิจกรรมวิเคราะห์หลักฐาน + ระบุวิธีชม Growth Mindset + PERMA" },
      { level: 3, text: "มี Active Learning + คำถามวิเคราะห์ แต่ไม่ระบุชุดคำถาม/ขาดวิธีสร้างบรรยากาศบวก" },
      { level: 2, text: "เน้นครูบรรยาย ผู้เรียนตอบสั้น/ทำใบงานท้ายชั่วโมง" },
      { level: 1, text: "ไม่มีขั้นตอนกิจกรรมชัด ระบุแค่หัวข้อ/ลอกตำรา" },
    ],
  },
  {
    code: "C4",
    title: "การใช้สื่อและเทคโนโลยี (Media & AI Tools)",
    signals: ["prompt"],
    descriptors: [
      { level: 4, text: "แนบ Prompt จริง + AI เป็น Devil's Advocate + ขั้นตอนให้ผู้เรียน Fact-check" },
      { level: 3, text: "ใช้สื่อจาก AI/แพลตฟอร์ม แต่ไม่มีขั้นตอนตรวจสอบความน่าเชื่อถือ" },
      { level: 2, text: "ใช้ AI แค่ช่วยครูทำสไลด์/ความสวยงาม ผู้เรียนไม่ได้ใช้" },
      { level: 1, text: "ไม่ระบุการใช้สื่อ/ไม่สอดคล้องเป้าหมาย" },
    ],
  },
  {
    code: "C5",
    title: "การประเมินผล (Evaluation & Assessment)",
    signals: ["rubric", "think_trail"],
    descriptors: [
      { level: 4, text: "มี Formative+Summative + แนบ Analytic Rubric วัด RL/CT + ชิ้นงานเก็บร่องรอยการคิด" },
      { level: 3, text: "ระบุวิธีวัด RL/CT + มีเครื่องมือ แต่เป็น Holistic Rubric กว้าง" },
      { level: 2, text: "วัดแค่ความรู้ความจำ (ปรนัย) ไม่วัด RL/CT" },
      { level: 1, text: "ไม่ระบุวิธี/เครื่องมือ หรือไม่สอดคล้องจุดประสงค์" },
    ],
  },
];

export type QualityBand = "innovative_master" | "fluent" | "developing" | "emerging";

export function scoreToBand(total: number): QualityBand {
  if (total >= 17) return "innovative_master";
  if (total >= 13) return "fluent";
  if (total >= 9) return "developing"; // ⚠️ ห้ามใช้สอนทันที
  return "emerging";
}

export const PLC_ACTION: Record<QualityBand, string> = {
  innovative_master:
    "ส่งเสริมให้จัดทำเป็นเล่มแผนการสอนตัวอย่าง (Best Practice) และขยายผลเป็นวิทยากรแกนนำ",
  fluent:
    "ให้คำแนะนำปรับถ้อยคำคำถามกระตุ้นคิด (Socratic) และเกณฑ์วัดผลให้คมชัดขึ้น แล้วนำไปใช้สอนได้ทันที",
  developing:
    "⚠️ ห้ามนำแผนไปใช้สอนทันที! CAM ต้องจัดตารางเข้าพบคู่พัฒนา (Mentor-Mentee) เพื่อช่วยเติมเครื่องมือ",
  emerging:
    "ต้องดึงเข้าวงกลุ่ม PLC ขนาดใหญ่เพื่อร่วมระดมสมอง (Co-design) และปรับโครงสร้างแผนใหม่ทั้งหมด",
};
