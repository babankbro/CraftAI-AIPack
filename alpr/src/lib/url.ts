/**
 * next/link และ router.push เติม basePath ให้อัตโนมัติ แต่ fetch() ไม่เติมให้
 * ใช้ helper นี้เฉพาะตอนเรียก fetch("/api/...") จาก client component
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function apiUrl(path: string): string {
  return `${BASE_PATH}${path}`;
}
