-- CreateTable
CREATE TABLE "matches" (
    "game_id" BIGINT NOT NULL,
    "game_duration" INTEGER NOT NULL,
    "game_creation_date" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("game_id")
);

-- CreateTable
CREATE TABLE "players" (
    "player_id" UUID NOT NULL,
    "puuid" TEXT,
    "game_name" TEXT,
    "tag_line" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("player_id")
);

-- CreateTable
CREATE TABLE "match_players" (
    "game_id" BIGINT NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "player_id" UUID NOT NULL,
    "team_id" INTEGER NOT NULL,
    "champion_id" INTEGER NOT NULL,
    "first_blood" BOOLEAN NOT NULL DEFAULT false,
    "first_tower" BOOLEAN NOT NULL DEFAULT false,
    "total_cs" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_players_pk" PRIMARY KEY ("game_id","participant_id")
);

-- CreateIndex
CREATE INDEX "matches_game_creation_date_idx" ON "matches"("game_creation_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "players_puuid_key" ON "players"("puuid");

-- CreateIndex
CREATE INDEX "match_players_player_id_idx" ON "match_players"("player_id");

-- CreateIndex
CREATE INDEX "match_players_game_id_idx" ON "match_players"("game_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_players_game_team_unique" ON "match_players"("game_id", "team_id");

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "matches"("game_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("player_id") ON DELETE CASCADE ON UPDATE CASCADE;
