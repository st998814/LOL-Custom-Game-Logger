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

function withPlayerEvidence(
  payload: Record<string, unknown>,
  playerIndex: number,
  evidence: Record<string, unknown>,
): Record<string, unknown> {
  const players = [...(payload.players as Array<Record<string, unknown>>)];
  players[playerIndex] = { ...players[playerIndex], ...evidence };
  return { ...payload, players };
}

describe.skipIf(!integrationEnabled)(
  'persistMatchSnapshot (live PostgreSQL)',
  () => {
    const createdGameIds: number[] = [];
    const createdNullPuuidPlayerIds: string[] = [];

    afterAll(async () => {
      for (const gameId of createdGameIds) {
        await cleanupMatch(gameId);
      }

      for (const playerId of createdNullPuuidPlayerIds) {
        await prisma.player.deleteMany({ where: { playerId } });
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
        winningTeamId: 200,
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

    it('normalizes empty/all-zero puuid to null and still stores player fields', async () => {
      const gameId = uniqueGameId();
      const payload = withGameId(loadMatchSnapshotFixture(), gameId);
      const players = payload.players as Array<Record<string, unknown>>;
      payload.players = [
        { ...players[0], puuid: '' },
        {
          ...players[1],
          puuid: '00000000000000000000000000000000',
        },
      ];

      createdGameIds.push(gameId);

      await persistMatchSnapshot(payload);

      const matchPlayers = await prisma.matchPlayer.findMany({
        where: { gameId },
        orderBy: { participantId: 'asc' },
        include: { player: true },
      });

      expect(matchPlayers).toHaveLength(2);

      expect(matchPlayers[0].player).toMatchObject({
        puuid: null,
        gameName: players[0].game_name,
        tagLine: players[0].tag_line,
      });
      expect(matchPlayers[0]).toMatchObject({
        participantId: players[0].participant_id,
        teamId: players[0].team_id,
        championId: players[0].champion_id,
        firstBlood: players[0].first_blood,
        firstTower: players[0].first_tower,
        totalCs: players[0].total_cs,
      });

      expect(matchPlayers[1].player).toMatchObject({
        puuid: null,
        gameName: players[1].game_name,
        tagLine: players[1].tag_line,
      });
      expect(matchPlayers[1]).toMatchObject({
        participantId: players[1].participant_id,
        teamId: players[1].team_id,
        championId: players[1].champion_id,
        firstBlood: players[1].first_blood,
        firstTower: players[1].first_tower,
        totalCs: players[1].total_cs,
      });

      createdNullPuuidPlayerIds.push(
        matchPlayers[0].playerId,
        matchPlayers[1].playerId,
      );
    });

    it('rejects duplicate team_id without writing ledger rows', async () => {
      const gameId = uniqueGameId();
      const payload = withGameId(loadMatchSnapshotFixture(), gameId);
      const players = payload.players as Array<Record<string, unknown>>;
      payload.players = [
        players[0],
        { ...players[1], team_id: players[0].team_id },
      ];

      await expect(persistMatchSnapshot(payload)).rejects.toThrow(
        'MATCH_SNAPSHOT must not have duplicate team_id values',
      );

      const matchCount = await prisma.match.count({ where: { gameId } });
      const matchPlayerCount = await prisma.matchPlayer.count({
        where: { gameId },
      });

      expect(matchCount).toBe(0);
      expect(matchPlayerCount).toBe(0);
    });

    it('does not persist ledger rows when neither player qualifies', async () => {
      const gameId = uniqueGameId();
      let payload = withGameId(loadMatchSnapshotFixture(), gameId);
      const players = payload.players as Array<Record<string, unknown>>;
      payload = {
        ...payload,
        players: [
          {
            ...players[0],
            first_blood: false,
            first_tower: false,
            total_cs: 49,
          },
          {
            ...players[1],
            first_blood: false,
            first_tower: false,
            total_cs: 69,
          },
        ],
      };

      await expect(persistMatchSnapshot(payload)).rejects.toThrow(
        'MATCH_SNAPSHOT has no contestable winner',
      );

      const matchCount = await prisma.match.count({ where: { gameId } });
      const matchPlayerCount = await prisma.matchPlayer.count({
        where: { gameId },
      });

      expect(matchCount).toBe(0);
      expect(matchPlayerCount).toBe(0);
    });

    it('does not persist ledger rows when both players qualify', async () => {
      const gameId = uniqueGameId();
      const payload = withGameId(loadMatchSnapshotFixture(), gameId);
      const players = payload.players as Array<Record<string, unknown>>;
      payload.players = [
        { ...players[0], first_blood: false, first_tower: false, total_cs: 100 },
        { ...players[1], first_blood: false, first_tower: false, total_cs: 120 },
      ];

      await expect(persistMatchSnapshot(payload)).rejects.toThrow(
        'MATCH_SNAPSHOT has ambiguous winner',
      );

      const matchCount = await prisma.match.count({ where: { gameId } });
      const matchPlayerCount = await prisma.matchPlayer.count({
        where: { gameId },
      });

      expect(matchCount).toBe(0);
      expect(matchPlayerCount).toBe(0);
    });

    it('stores winningTeamId from CS threshold evidence', async () => {
      const gameId = uniqueGameId();
      let payload = withGameId(loadMatchSnapshotFixture(), gameId);
      payload = withPlayerEvidence(payload, 0, {
        first_blood: false,
        first_tower: false,
        total_cs: 49,
      });
      payload = withPlayerEvidence(payload, 1, {
        first_blood: false,
        first_tower: false,
        total_cs: 100,
      });

      createdGameIds.push(gameId);

      await persistMatchSnapshot(payload);

      const match = await prisma.match.findUnique({ where: { gameId } });
      expect(match?.winningTeamId).toBe(200);
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
