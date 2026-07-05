import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const useSsl = process.env.MINIO_USE_SSL === "true";
const endpoint = `${useSsl ? "https" : "http"}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;

const credentials = {
  accessKeyId: process.env.MINIO_ACCESS_KEY!,
  secretAccessKey: process.env.MINIO_SECRET_KEY!,
};

/** ใช้เชื่อมต่อ MinIO จากฝั่งเซิร์ฟเวอร์ (ภายใน docker network เช่น "minio:9000") */
export const s3 = new S3Client({
  endpoint,
  region: "us-east-1", // MinIO ไม่สนใจ region จริง แต่ SDK ต้องการค่า
  forcePathStyle: true, // จำเป็นสำหรับ MinIO
  credentials,
});

/**
 * client แยกต่างหากสำหรับ "เซ็น" presigned URL เท่านั้น (ไม่ได้ใช้เชื่อมต่อจริง)
 * เพราะ endpoint ที่ใช้เซ็น (MINIO_ENDPOINT="minio", ชื่อ host ภายใน docker network)
 * ไม่ใช่ endpoint ที่ browser ของผู้ใช้เข้าถึงได้ — ต้องเซ็นด้วย public endpoint แยกต่างหาก
 * (dev default: localhost:9000 ซึ่ง map ออกมาจาก docker-compose แล้ว)
 */
const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT || "http://localhost:9000";
const s3Public = new S3Client({
  endpoint: publicEndpoint,
  region: "us-east-1",
  forcePathStyle: true,
  credentials,
});

export const BUCKETS = {
  plans: process.env.MINIO_BUCKET_PLANS || "alpr-plans",
  reports: process.env.MINIO_BUCKET_REPORTS || "alpr-reports",
  extracted: process.env.MINIO_BUCKET_EXTRACTED || "alpr-extracted",
} as const;

/** อัปโหลดไฟล์แผน/รายงาน — คืน object key (ไม่ใช่ URL) */
export async function putObject(
  bucket: string,
  buffer: Buffer,
  contentType: string,
  keyPrefix: string
): Promise<string> {
  const key = `${keyPrefix}/${randomUUID()}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

/** presigned URL อายุสั้น (default 5 นาที) — ใช้ทั้งดาวน์โหลดแผนและรายงาน PDF */
export async function getPresignedUrl(
  bucket: string,
  key: string,
  expiresInSeconds = 300
): Promise<string> {
  return getSignedUrl(
    s3Public,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
