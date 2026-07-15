/*
  Warnings:

  - Added the required column `winning_team_id` to the `matches` table without a default value. This is not possible if the table is not empty.

*/
-- Legacy dev/test rows lack stored winners (pre REQ-SRV-07); clear before NOT NULL column.
DELETE FROM "matches";

-- AlterTable
ALTER TABLE "matches" ADD COLUMN "winning_team_id" INTEGER NOT NULL;
