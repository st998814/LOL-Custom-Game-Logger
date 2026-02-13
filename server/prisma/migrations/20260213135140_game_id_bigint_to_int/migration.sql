/*
  Warnings:

  - The primary key for the `match_players` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `game_id` on the `match_players` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `matches` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `game_id` on the `matches` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- DropForeignKey
ALTER TABLE "match_players" DROP CONSTRAINT "match_players_game_id_fkey";

-- AlterTable
ALTER TABLE "match_players" DROP CONSTRAINT "match_players_pk",
ALTER COLUMN "game_id" SET DATA TYPE INTEGER,
ADD CONSTRAINT "match_players_pk" PRIMARY KEY ("game_id", "participant_id");

-- AlterTable
ALTER TABLE "matches" DROP CONSTRAINT "matches_pkey",
ALTER COLUMN "game_id" SET DATA TYPE INTEGER,
ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("game_id");

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "matches"("game_id") ON DELETE CASCADE ON UPDATE CASCADE;
