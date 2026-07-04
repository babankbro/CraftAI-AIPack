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

export const s3 = new S3Client({
  endpoint,
  region: "us-east-1", // MinIO ไม่สนใจ region จริง แต่ SDK ต้องการค่า
  forcePathStyle: true, // จำเป็นสำหรับ MinIO
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
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
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
