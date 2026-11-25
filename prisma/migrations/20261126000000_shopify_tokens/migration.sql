-- CreateTable
CREATE TABLE "shopify_tokens" (
    "shop" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_tokens_pkey" PRIMARY KEY ("shop")
);
