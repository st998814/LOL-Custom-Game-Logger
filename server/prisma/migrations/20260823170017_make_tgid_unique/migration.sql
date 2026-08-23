/*
  Warnings:

  - A unique constraint covering the columns `[tg_id]` on the table `players` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "players_tg_id_key" ON "players"("tg_id");
