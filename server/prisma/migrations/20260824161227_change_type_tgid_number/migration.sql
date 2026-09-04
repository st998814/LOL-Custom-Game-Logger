/*
  Warnings:

  - The `tg_id` column on the `players` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "players" DROP COLUMN "tg_id",
ADD COLUMN     "tg_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "players_tg_id_key" ON "players"("tg_id");
