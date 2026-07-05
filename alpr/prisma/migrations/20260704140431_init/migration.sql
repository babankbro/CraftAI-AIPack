-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('cat', 'cam', 'admin');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'pending_role', 'disabled');

-- CreateEnum
CREATE TYPE "plan_status" AS ENUM ('uploaded', 'processing', 'ai_pending', 'waiting_cam', 'in_review', 'done', 'failed');

-- CreateEnum
CREATE TYPE "file_type" AS ENUM ('pdf', 'docx');

-- CreateEnum
CREATE TYPE "ai_provider" AS ENUM ('gemini', 'openai', 'claude');

-- CreateEnum
CREATE TYPE "quality_band" AS ENUM ('innovative_master', 'fluent', 'developing', 'emerging');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "district" TEXT,
    "province" TEXT NOT NULL DEFAULT 'กาฬสินธุ์',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "google_sub" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'cat',
    "status" "user_status" NOT NULL DEFAULT 'pending_role',
    "school_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_links" (
    "id" UUID NOT NULL,
    "cam_id" UUID NOT NULL,
    "cat_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubric_versions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 20,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rubric_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubric_criteria" (
    "id" UUID NOT NULL,
    "rubric_version_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "maxLevel" INTEGER NOT NULL DEFAULT 4,
    "descriptors" JSONB NOT NULL,
    "signals" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_plans" (
    "id" UUID NOT NULL,
    "cat_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT,
    "grade" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previous_version_id" UUID,
    "file_key" TEXT NOT NULL,
    "file_type" "file_type" NOT NULL,
    "file_size_bytes" BIGINT,
    "status" "plan_status" NOT NULL DEFAULT 'uploaded',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extractions" (
    "plan_id" UUID NOT NULL,
    "text" TEXT,
    "ocr_used" BOOLEAN NOT NULL DEFAULT false,
    "page_count" INTEGER,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extractions_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "ai_evaluations" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "provider" "ai_provider" NOT NULL,
    "model" TEXT NOT NULL,
    "rubric_version_id" UUID NOT NULL,
    "criteria" JSONB NOT NULL,
    "suggested_total" INTEGER,
    "prompt_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_evaluations" (
    "plan_id" UUID NOT NULL,
    "cam_id" UUID NOT NULL,
    "based_on_ai_id" UUID,
    "rubric_version_id" UUID NOT NULL,
    "criteria_final" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "band" "quality_band" NOT NULL,
    "plc_action" TEXT,
    "strengths" TEXT,
    "areas_for_growth" TEXT,
    "report_key" TEXT,
    "signature" TEXT,
    "position" TEXT,
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_evaluations_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "criterion" TEXT NOT NULL,
    "ai_level" INTEGER,
    "cam_level" INTEGER NOT NULL,
    "changed_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "schools_code_key" ON "schools"("code");

-- CreateIndex
CREATE INDEX "schools_name_idx" ON "schools"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_school_id_idx" ON "users"("school_id");

-- CreateIndex
CREATE INDEX "mentor_links_cat_id_idx" ON "mentor_links"("cat_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_links_cam_id_cat_id_key" ON "mentor_links"("cam_id", "cat_id");

-- CreateIndex
CREATE UNIQUE INDEX "rubric_versions_code_key" ON "rubric_versions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "rubric_criteria_rubric_version_id_code_key" ON "rubric_criteria"("rubric_version_id", "code");

-- CreateIndex
CREATE INDEX "lesson_plans_cat_id_idx" ON "lesson_plans"("cat_id");

-- CreateIndex
CREATE INDEX "lesson_plans_status_idx" ON "lesson_plans"("status");

-- CreateIndex
CREATE INDEX "lesson_plans_created_at_idx" ON "lesson_plans"("created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_evaluations_plan_id_created_at_idx" ON "ai_evaluations"("plan_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "final_evaluations_cam_id_idx" ON "final_evaluations"("cam_id");

-- CreateIndex
CREATE INDEX "audit_logs_plan_id_created_at_idx" ON "audit_logs"("plan_id", "created_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_links" ADD CONSTRAINT "mentor_links_cam_id_fkey" FOREIGN KEY ("cam_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_links" ADD CONSTRAINT "mentor_links_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubric_criteria" ADD CONSTRAINT "rubric_criteria_rubric_version_id_fkey" FOREIGN KEY ("rubric_version_id") REFERENCES "rubric_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "lesson_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "lesson_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_evaluations" ADD CONSTRAINT "ai_evaluations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "lesson_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_evaluations" ADD CONSTRAINT "ai_evaluations_rubric_version_id_fkey" FOREIGN KEY ("rubric_version_id") REFERENCES "rubric_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_evaluations" ADD CONSTRAINT "final_evaluations_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "lesson_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_evaluations" ADD CONSTRAINT "final_evaluations_cam_id_fkey" FOREIGN KEY ("cam_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_evaluations" ADD CONSTRAINT "final_evaluations_rubric_version_id_fkey" FOREIGN KEY ("rubric_version_id") REFERENCES "rubric_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "lesson_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
