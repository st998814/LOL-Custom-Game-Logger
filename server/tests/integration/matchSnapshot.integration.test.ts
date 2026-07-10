import 'dotenv/config';

import { afterAll, describe, expect, it } from 'vitest';

import prisma from '../../src/db/prisma.js';
import { persistMatchSnapshot } from '../../src/services/matchSnapshot.service.js';
import {
  loadMatchSnapshotFixture,
  withGameId,
} from '../helpers/ingestFixtures.js';

const integrationEnabled = Boolean(process.env.DATABASE_URL);

function uniqueGameId(): number {
  return 970_000_000 + Math.floor(Math.random() * 19_999_999);
}

async function cleanupMatch(gameId: number): Promise<void> {
  await prisma.match.deleteMany({ where: { gameId } });
}

describe.skipIf(!integrationEnabled)(
  'persistMatchSnapshot (live PostgreSQL)',
  () => {
    const createdGameIds: number[] = [];

    afterAll(async () => {
      for (const gameId of createdGameIds) {
        await cleanupMatch(gameId);
      }

      await prisma.$disconnect();
    });

    it('persists match, players, and match_players with core field values', async () => {
      const gameId = uniqueGameId();
      const payload = withGameId(loadMatchSnapshotFixture(), gameId);
      const players = payload.players as Array<Record<string, unknown>>;

      createdGameIds.push(gameId);

      await persistMatchSnapshot(payload);

      const match = await prisma.match.findUnique({ where: { gameId } });
      expect(match).toMatchObject({
        gameId,
        gameDuration: 628,
        gameCreationDate: new Date('2026-03-16T12:32:09.240Z'),
      });

      const matchPlayers = await prisma.matchPlayer.findMany({
        where: { gameId },
        orderBy: { participantId: 'asc' },
        include: { player: true },
      });

      expect(matchPlayers).toHaveLength(2);

      expect(matchPlayers[0]).toMatchObject({
        participantId: players[0].participant_id,
        teamId: players[0].team_id,
        championId: players[0].champion_id,
        firstBlood: players[0].first_blood,
        firstTower: players[0].first_tower,
        totalCs: players[0].total_cs,
      });
      expect(matchPlayers[0].player).toMatchObject({
        puuid: players[0].puuid,
        gameName: players[0].game_name,
        tagLine: players[0].tag_line,
      });

      expect(matchPlayers[1]).toMatchObject({
        participantId: players[1].participant_id,
        teamId: players[1].team_id,
        championId: players[1].champion_id,
        firstBlood: players[1].first_blood,
        firstTower: players[1].first_tower,
        totalCs: players[1].total_cs,
      });
      expect(matchPlayers[1].player).toMatchObject({
        puuid: players[1].puuid,
        gameName: players[1].game_name,
        tagLine: players[1].tag_line,
      });
    });

    it('rejects duplicate game_id without creating a second match row', async () => {
      const gameId = uniqueGameId();
      const payload = withGameId(loadMatchSnapshotFixture(), gameId);

      createdGameIds.push(gameId);

      await persistMatchSnapshot(payload);

      await expect(persistMatchSnapshot(payload)).rejects.toThrow(
        `Match already exists for game_id ${gameId}`,
      );

      const matchCount = await prisma.match.count({ where: { gameId } });
      const matchPlayerCount = await prisma.matchPlayer.count({
        where: { gameId },
      });

      expect(matchCount).toBe(1);
      expect(matchPlayerCount).toBe(2);
    });

    it('does not persist partial ledger rows when players are invalid', async () => {
      const gameId = uniqueGameId();
      const payload = withGameId(loadMatchSnapshotFixture(), gameId);
      const players = payload.players as Array<Record<string, unknown>>;
      payload.players = [
        players[0],
        { ...players[1], participant_id: undefined, champion_id: undefined },
      ];

      await expect(persistMatchSnapshot(payload)).rejects.toThrow(
        'MATCH_SNAPSHOT must produce exactly 2 valid match_players',
      );

      const matchCount = await prisma.match.count({ where: { gameId } });
      const matchPlayerCount = await prisma.matchPlayer.count({
        where: { gameId },
      });

      expect(matchCount).toBe(0);
      expect(matchPlayerCount).toBe(0);
    });
  },
);

describe.skipIf(integrationEnabled)(
  'persistMatchSnapshot (live PostgreSQL)',
  () => {
    it('skipped — set DATABASE_URL in server/.env to run integration tests', () => {
      expect(true).toBe(true);
    });
  },
);
