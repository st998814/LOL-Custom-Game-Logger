-- CreateEnum
CREATE TYPE "RawEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "raw_events" (
    "id" BIGSERIAL NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "RawEventStatus" NOT NULL DEFAULT 'PENDING',
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "deduplication_key" TEXT,

    CONSTRAINT "raw_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "raw_events_status_received_idx" ON "raw_events"("status", "received_at" ASC);

-- CreateIndex
CREATE INDEX "raw_events_event_type_idx" ON "raw_events"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "raw_events_dedupe_key_unique" ON "raw_events"("deduplication_key");
