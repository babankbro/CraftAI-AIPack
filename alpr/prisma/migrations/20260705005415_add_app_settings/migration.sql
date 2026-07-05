-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "ai_provider" "ai_provider" NOT NULL DEFAULT 'gemini',
    "gemini_model" TEXT,
    "openai_model" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);
