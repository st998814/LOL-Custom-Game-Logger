-- AlterTable
-- Widening INTEGER to BIGINT keeps existing values and the unique index.
ALTER TABLE "players" ALTER COLUMN "tg_id" SET DATA TYPE BIGINT;
