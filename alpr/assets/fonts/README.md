# ฟอนต์ไทยสำหรับรายงาน PDF

`pdf-lib` ไม่มีฟอนต์ไทยในตัว (14 Standard Fonts รองรับแค่ Latin) — ต้องนำไฟล์ฟอนต์ TTF
ที่รองรับ Unicode ภาษาไทยมาวางไว้ที่นี่ก่อนรายงาน PDF จะแสดงผลภาษาไทยถูกต้อง

## วิธีติดตั้ง
1. ดาวน์โหลดฟอนต์ **IBM Plex Sans Thai** (Regular) — ใบอนุญาต SIL Open Font License
   จาก https://fonts.google.com/specimen/IBM+Plex+Sans+Thai
2. วางไฟล์ไว้ที่: `assets/fonts/IBMPlexSansThai-Regular.ttf`
3. ตั้ง env `REPORT_FONT_PATH=assets/fonts/IBMPlexSansThai-Regular.ttf` (ค่าเริ่มต้นตรงนี้อยู่แล้วใน `src/lib/report.ts`)

## สถานะปัจจุบัน
✅ ใส่ไฟล์ฟอนต์แล้ว (`IBMPlexSansThai-Regular.ttf`, ดาวน์โหลดจาก [google/fonts](https://github.com/google/fonts/tree/main/ofl/ibmplexsansthai) repo — SIL OFL)
ถ้าไม่พบไฟล์ฟอนต์ตาม path ที่ตั้งไว้ `src/lib/report.ts` จะ throw error ที่อธิบายชัดเจน
แทนที่จะสร้าง PDF ที่ตัวอักษรไทยแสดงผลผิดเพี้ยนแบบเงียบ ๆ
