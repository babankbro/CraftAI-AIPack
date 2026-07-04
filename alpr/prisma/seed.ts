import { PrismaClient, Prisma } from "@prisma/client";
import { AIPACK_RUBRIC, RUBRIC_VERSION_CODE } from "../src/lib/ai/rubric";

const prisma = new PrismaClient();

async function main() {
  // ── Rubric (มติ ④) ──
  const rubricVersion = await prisma.rubricVersion.upsert({
    where: { code: RUBRIC_VERSION_CODE },
    create: { code: RUBRIC_VERSION_CODE, maxScore: 20, isActive: true },
    update: { isActive: true },
  });

  for (const [i, criterion] of AIPACK_RUBRIC.entries()) {
    await prisma.rubricCriterion.upsert({
      where: {
        rubricVersionId_code: { rubricVersionId: rubricVersion.id, code: criterion.code },
      },
      create: {
        rubricVersionId: rubricVersion.id,
        code: criterion.code,
        title: criterion.title,
        maxLevel: 4,
        descriptors: criterion.descriptors as unknown as Prisma.InputJsonValue,
        signals: (criterion.signals ?? []) as unknown as Prisma.InputJsonValue,
        sortOrder: i,
      },
      update: {
        title: criterion.title,
        descriptors: criterion.descriptors as unknown as Prisma.InputJsonValue,
        signals: (criterion.signals ?? []) as unknown as Prisma.InputJsonValue,
        sortOrder: i,
      },
    });
  }
  console.log(`✓ rubric ${RUBRIC_VERSION_CODE} + ${AIPACK_RUBRIC.length} criteria`);

  // ── Schools (มติ ②) — โรงเรียนนำร่องตัวอย่าง จ.กาฬสินธุ์ ──
  const school = await prisma.school.upsert({
    where: { code: "KSU-DEMO-01" },
    create: {
      name: "โรงเรียนสาธิตนำร่อง (ตัวอย่าง)",
      code: "KSU-DEMO-01",
      district: "เมืองกาฬสินธุ์",
      province: "กาฬสินธุ์",
    },
    update: {},
  });
  console.log(`✓ school: ${school.name}`);

  console.log("Seed เสร็จสิ้น");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
