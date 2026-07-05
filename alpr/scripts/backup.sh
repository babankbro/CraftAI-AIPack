#!/bin/sh
# ALPR — Production backup (M8): pg_dump ของ Postgres + mc mirror ของ MinIO buckets
# ใช้ผ่าน cron บนโฮสต์ หรือ scheduler container ที่ mount docker.sock/network เดียวกับ prod stack
# ตัวอย่าง crontab (backup ทุกวันตี 2): 0 2 * * * /path/to/alpr/scripts/backup.sh >> /var/log/alpr-backup.log 2>&1
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-alpr-postgres-1}"
MINIO_ALIAS="${MINIO_ALIAS:-alpr-backup-src}"
MINIO_ENDPOINT="${MINIO_ENDPOINT_URL:-http://localhost:9000}"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/minio"

echo "[backup] $STAMP — dumping postgres from $POSTGRES_CONTAINER"
docker exec "$POSTGRES_CONTAINER" pg_dump -U alpr -d alpr --format=custom \
  > "$BACKUP_DIR/db/alpr_${STAMP}.dump"

echo "[backup] $STAMP — mirroring MinIO buckets (alpr-plans, alpr-reports, alpr-extracted)"
mc alias set "$MINIO_ALIAS" "$MINIO_ENDPOINT" "${MINIO_ACCESS_KEY:-minio}" "${MINIO_SECRET_KEY:-minio12345}" >/dev/null
for bucket in alpr-plans alpr-reports alpr-extracted; do
  mc mirror --overwrite "$MINIO_ALIAS/$bucket" "$BACKUP_DIR/minio/$bucket"
done

echo "[backup] $STAMP — pruning db dumps older than 30 days"
find "$BACKUP_DIR/db" -name "alpr_*.dump" -mtime +30 -delete

echo "[backup] $STAMP — done"
