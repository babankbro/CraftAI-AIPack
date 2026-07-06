# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
# OCR ไทย (Tesseract CLI) + libc compat สำหรับ prisma engine
# หมายเหตุ: render หน้า PDF เป็นภาพใช้ pdf-parse's getScreenshot() (พึ่ง pdf.js ในตัว) ไม่ต้องมี poppler-utils แยก
RUN apk add --no-cache libc6-compat tesseract-ocr tesseract-ocr-data-tha openssl

FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# ---------- dev (hot reload, ใช้ใน docker-compose.yml) ----------
FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------- build (สำหรับ prod) ----------
FROM deps AS build
WORKDIR /app
COPY . .
RUN npx prisma generate && npm run build

# ---------- runner (prod, standalone) ----------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/assets ./assets

# @napi-rs/canvas (native addon ให้ pdfjs-dist render หน้า PDF เป็นภาพสำหรับ OCR)
# ไม่ถูกดึงเข้า .next/standalone อัตโนมัติ เพราะ pdfjs-dist require มันแบบ dynamic/optional
# ที่ next build's dependency tracing (node-file-trace) มองไม่เห็น — ต้อง copy เองตรง ๆ
COPY --from=build /app/node_modules/@napi-rs ./node_modules/@napi-rs
EXPOSE 3000
CMD ["node", "server.js"]
