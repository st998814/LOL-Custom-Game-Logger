import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../db/prisma.js';
import {
  deriveWinningTeamId,
  persistMatchSnapshot,
  playerQualifies,
} from './matchSnapshot.service.js';
import type { ParsedPlayer } from './matchSnapshot.service.js';
import {
  loadMatchSnapshotFixture,
  withGameId,
} from '../../tests/helpers/ingestFixtures.js';

vi.mock('../db/prisma.js', () => ({
  default: {
    match: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockedPrisma = vi.mocked(prisma);
const mockedFindUnique = vi.mocked(prisma.match.findUnique);
const mockedTransaction = vi.mocked(prisma.$transaction);

function buildTransactionMock() {
  const tx = {
    match: { create: vi.fn().mockResolvedValue(undefined) },
    player: { upsert: vi.fn(), create: vi.fn() },
    matchPlayer: { create: vi.fn().mockResolvedValue(undefined) },
  };

  mockedTransaction.mockImplementation(async (callback) =>
    callback(tx as never),
  );

  return tx;
}

function parsedPlayer(
  overrides: Partial<ParsedPlayer> & Pick<ParsedPlayer, 'teamId'>,
): ParsedPlayer {
  return {
    participantId: overrides.teamId === 100 ? 1 : 2,
    teamId: overrides.teamId,
    championId: 54,
    normalizedPuuid: null,
    gameName: 'Player',
    tagLine: 'tag',
    firstBlood: false,
    firstTower: false,
    totalCs: 0,
    ...overrides,
  };
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

describe('deriveWinningTeamId', () => {
  it('returns team with first blood', () => {
    const players = [
      parsedPlayer({ teamId: 100 }),
      parsedPlayer({ teamId: 200, firstBlood: true }),
    ];

    expect(deriveWinningTeamId(players)).toBe(200);
  });

  it('returns team with first tower', () => {
    const players = [
      parsedPlayer({ teamId: 100, firstTower: true }),
      parsedPlayer({ teamId: 200 }),
    ];

    expect(deriveWinningTeamId(players)).toBe(100);
  });

  it('returns team with CS at or above 100', () => {
    const players = [
      parsedPlayer({ teamId: 100, totalCs: 99 }),
      parsedPlayer({ teamId: 200, totalCs: 100 }),
    ];

    expect(deriveWinningTeamId(players)).toBe(200);
  });

  it('throws when neither player qualifies', () => {
    const players = [
      parsedPlayer({ teamId: 100, totalCs: 49 }),
      parsedPlayer({ teamId: 200, totalCs: 69 }),
    ];

    expect(() => deriveWinningTeamId(players)).toThrow(
      'MATCH_SNAPSHOT has no contestable winner',
    );
  });

  it('throws when both players qualify', () => {
    const players = [
      parsedPlayer({ teamId: 100, totalCs: 100 }),
      parsedPlayer({ teamId: 200, totalCs: 120 }),
    ];

    expect(() => deriveWinningTeamId(players)).toThrow(
      'MATCH_SNAPSHOT has ambiguous winner',
    );
  });

  it('throws when both players have first_blood', () => {
    const players = [
      parsedPlayer({ teamId: 100, firstBlood: true }),
      parsedPlayer({ teamId: 200, firstBlood: true }),
    ];

    expect(() => deriveWinningTeamId(players)).toThrow(
      'MATCH_SNAPSHOT has ambiguous winner: conflicting first_blood flags',
    );
  });

  it('throws when both players have first_tower', () => {
    const players = [
      parsedPlayer({ teamId: 100, firstTower: true }),
      parsedPlayer({ teamId: 200, firstTower: true }),
    ];

    expect(() => deriveWinningTeamId(players)).toThrow(
      'MATCH_SNAPSHOT has ambiguous winner: conflicting first_tower flags',
    );
  });
});

describe('playerQualifies', () => {
  it('qualifies on first blood, first tower, or CS threshold', () => {
    expect(playerQualifies(parsedPlayer({ teamId: 100, firstBlood: true }))).toBe(
      true,
    );
    expect(playerQualifies(parsedPlayer({ teamId: 100, firstTower: true }))).toBe(
      true,
    );
    expect(playerQualifies(parsedPlayer({ teamId: 100, totalCs: 100 }))).toBe(
      true,
    );
    expect(playerQualifies(parsedPlayer({ teamId: 100, totalCs: 99 }))).toBe(
      false,
    );
  });
});

describe('persistMatchSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists match, players, and match_players in one transaction (S1-S5)', async () => {
    const gameId = 900_010_001;
    const payload = withGameId(loadMatchSnapshotFixture(), gameId);
    const players = payload.players as Array<Record<string, unknown>>;
    const tx = buildTransactionMock();

    mockedFindUnique.mockResolvedValue(null);
    tx.player.upsert
      .mockResolvedValueOnce({ playerId: 'player-uuid-1' })
      .mockResolvedValueOnce({ playerId: 'player-uuid-2' });

    await persistMatchSnapshot(payload);

    expect(mockedFindUnique).toHaveBeenCalledWith({ where: { gameId } });
    expect(mockedTransaction).toHaveBeenCalledTimes(1);

    expect(tx.match.create).toHaveBeenCalledWith({
      data: {
        gameId,
        gameDuration: 628,
        gameCreationDate: new Date('2026-03-16T12:32:09.240Z'),
        winningTeamId: 200,
      },
    });

    expect(tx.player.upsert).toHaveBeenCalledTimes(2);
    expect(tx.player.upsert).toHaveBeenNthCalledWith(1, {
      where: { puuid: players[0].puuid },
      update: {
        gameName: players[0].game_name,
        tagLine: players[0].tag_line,
      },
      create: {
        puuid: players[0].puuid,
        gameName: players[0].game_name,
        tagLine: players[0].tag_line,
      },
    });

    expect(tx.matchPlayer.create).toHaveBeenCalledTimes(2);
    expect(tx.matchPlayer.create).toHaveBeenNthCalledWith(1, {
      data: {
        gameId,
        participantId: players[0].participant_id,
        playerId: 'player-uuid-1',
        teamId: players[0].team_id,
        championId: players[0].champion_id,
        firstBlood: players[0].first_blood,
        firstTower: players[0].first_tower,
        totalCs: players[0].total_cs,
      },
    });
    expect(tx.matchPlayer.create).toHaveBeenNthCalledWith(2, {
      data: {
        gameId,
        participantId: players[1].participant_id,
        playerId: 'player-uuid-2',
        teamId: players[1].team_id,
        championId: players[1].champion_id,
        firstBlood: players[1].first_blood,
        firstTower: players[1].first_tower,
        totalCs: players[1].total_cs,
      },
    });
  });

  it('rejects when match row already exists (F2)', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900_010_002);

    mockedFindUnique.mockResolvedValue({
      gameId: 900_010_002,
      gameDuration: 628,
      gameCreationDate: new Date('2026-03-16T12:32:09.240Z'),
      createdAt: new Date(),
    });

    await expect(persistMatchSnapshot(payload)).rejects.toThrow(
      'Match already exists for game_id 900010002',
    );
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects when fewer than 2 valid players can be persisted (F1)', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900_010_003);
    const players = payload.players as Array<Record<string, unknown>>;
    payload.players = [
      players[0],
      { ...players[1], participant_id: undefined, champion_id: undefined },
    ];

    mockedFindUnique.mockResolvedValue(null);

    await expect(persistMatchSnapshot(payload)).rejects.toThrow(
      'MATCH_SNAPSHOT must produce exactly 2 valid match_players',
    );
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects missing match field (F3)', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900_010_004);
    delete payload.match;

    await expect(persistMatchSnapshot(payload)).rejects.toThrow(
      'MATCH_SNAPSHOT payload is missing "match" field',
    );
    expect(mockedFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects empty players array (F3)', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900_010_005);
    payload.players = [];

    await expect(persistMatchSnapshot(payload)).rejects.toThrow(
      'MATCH_SNAPSHOT payload is missing "players" array',
    );
    expect(mockedFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects invalid game_creation_date', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900_010_006);
    const match = payload.match as Record<string, unknown>;
    payload.match = {
      ...match,
      game_creation_date: 'not-a-date',
    };

    await expect(persistMatchSnapshot(payload)).rejects.toThrow(
      'MATCH_SNAPSHOT payload has invalid game_creation_date',
    );
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it('rejects missing game_id', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900_010_007);
    const match = payload.match as Record<string, unknown>;
    const { game_id: _removed, ...matchWithoutGameId } = match;
    payload.match = matchWithoutGameId;

    await expect(persistMatchSnapshot(payload)).rejects.toThrow(
      'MATCH_SNAPSHOT payload is missing basic match fields',
    );
    expect(mockedFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects missing game_duration', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900_010_008);
    const match = payload.match as Record<string, unknown>;
    const { game_duration: _removed, ...matchWithoutDuration } = match;
    payload.match = matchWithoutDuration;

    await expect(persistMatchSnapshot(payload)).rejects.toThrow(
      'MATCH_SNAPSHOT payload is missing basic match fields',
    );
    expect(mockedFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('creates player with null puuid when empty string is provided', async () => {
    const gameId = 900_010_009;
    const payload = withGameId(loadMatchSnapshotFixture(), gameId);
    const players = payload.players as Array<Record<string, unknown>>;
    payload.players = [{ ...players[0], puuid: '' }, players[1]];
    const tx = buildTransactionMock();

    mockedFindUnique.mockResolvedValue(null);
    tx.player.create.mockResolvedValueOnce({ playerId: 'player-null-1' });
    tx.player.upsert.mockResolvedValueOnce({ playerId: 'player-uuid-2' });

    await persistMatchSnapshot(payload);

    expect(tx.player.create).toHaveBeenCalledTimes(1);
    expect(tx.player.create).toHaveBeenCalledWith({
      data: {
        puuid: null,
        gameName: players[0].game_name,
        tagLine: players[0].tag_line,
      },
    });
    expect(tx.player.upsert).toHaveBeenCalledTimes(1);
    expect(tx.matchPlayer.create).toHaveBeenNthCalledWith(1, {
      data: {
        gameId,
        participantId: players[0].participant_id,
        playerId: 'player-null-1',
        teamId: players[0].team_id,
        championId: players[0].champion_id,
        firstBlood: players[0].first_blood,
        firstTower: players[0].first_tower,
        totalCs: players[0].total_cs,
      },
    });
  });

  it('creates player with null puuid when all-zero placeholder is provided', async () => {
    const gameId = 900_010_010;
    const payload = withGameId(loadMatchSnapshotFixture(), gameId);
    const players = payload.players as Array<Record<string, unknown>>;
    payload.players = [
      { ...players[0], puuid: '00000000000000000000000000000000' },
      players[1],
    ];
    const tx = buildTransactionMock();

    mockedFindUnique.mockResolvedValue(null);
    tx.player.create.mockResolvedValueOnce({ playerId: 'player-null-1' });
    tx.player.upsert.mockResolvedValueOnce({ playerId: 'player-uuid-2' });

    await persistMatchSnapshot(payload);

    expect(tx.player.create).toHaveBeenCalledTimes(1);
    expect(tx.player.create).toHaveBeenCalledWith({
      data: {
        puuid: null,
        gameName: players[0].game_name,
        tagLine: players[0].tag_line,
      },
    });
    expect(tx.player.upsert).toHaveBeenCalledTimes(1);
    expect(tx.matchPlayer.create).toHaveBeenNthCalledWith(1, {
      data: {
        gameId,
        participantId: players[0].participant_id,
        playerId: 'player-null-1',
        teamId: players[0].team_id,
        championId: players[0].champion_id,
        firstBlood: players[0].first_blood,
        firstTower: players[0].first_tower,
        totalCs: players[0].total_cs,
      },
    });
  });

  it('rejects duplicate team_id values before DB writes', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900_010_011);
    const players = payload.players as Array<Record<string, unknown>>;
    payload.players = [
      players[0],
      { ...players[1], team_id: players[0].team_id },
    ];

    await expect(persistMatchSnapshot(payload)).rejects.toThrow(
      'MATCH_SNAPSHOT must not have duplicate team_id values',
    );
    expect(mockedFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('stores winningTeamId from first tower evidence', async () => {
    const gameId = 900_010_012;
    let payload = withGameId(loadMatchSnapshotFixture(), gameId);
    payload = withPlayerEvidence(payload, 0, {
      first_blood: false,
      first_tower: true,
      total_cs: 49,
    });
    payload = withPlayerEvidence(payload, 1, {
      first_blood: false,
      first_tower: false,
      total_cs: 69,
    });
    const tx = buildTransactionMock();

    mockedFindUnique.mockResolvedValue(null);
    tx.player.upsert
      .mockResolvedValueOnce({ playerId: 'player-uuid-1' })
      .mockResolvedValueOnce({ playerId: 'player-uuid-2' });

    await persistMatchSnapshot(payload);

    expect(tx.match.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gameId,
        winningTeamId: 100,
      }),
    });
  });

  it('stores winningTeamId from CS threshold evidence', async () => {
    const gameId = 900_010_013;
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
    const tx = buildTransactionMock();

    mockedFindUnique.mockResolvedValue(null);
    tx.player.upsert
      .mockResolvedValueOnce({ playerId: 'player-uuid-1' })
      .mockResolvedValueOnce({ playerId: 'player-uuid-2' });

    await persistMatchSnapshot(payload);

    expect(tx.match.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gameId,
        winningTeamId: 200,
      }),
    });
  });

  it('rejects when neither player qualifies before DB writes', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900_010_014);
    const players = payload.players as Array<Record<string, unknown>>;
    payload.players = [
      { ...players[0], first_blood: false, first_tower: false, total_cs: 49 },
      { ...players[1], first_blood: false, first_tower: false, total_cs: 69 },
    ];

    await expect(persistMatchSnapshot(payload)).rejects.toThrow(
      'MATCH_SNAPSHOT has no contestable winner',
    );
    expect(mockedFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects when both players qualify before DB writes', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900_010_015);
    const players = payload.players as Array<Record<string, unknown>>;
    payload.players = [
      { ...players[0], first_blood: false, first_tower: false, total_cs: 100 },
      { ...players[1], first_blood: false, first_tower: false, total_cs: 120 },
    ];

    await expect(persistMatchSnapshot(payload)).rejects.toThrow(
      'MATCH_SNAPSHOT has ambiguous winner',
    );
    expect(mockedFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('rejects conflicting first_blood flags before DB writes', async () => {
    const payload = withGameId(loadMatchSnapshotFixture(), 900_010_016);
    const players = payload.players as Array<Record<string, unknown>>;
    payload.players = [
      { ...players[0], first_blood: true },
      { ...players[1], first_blood: true },
    ];

    await expect(persistMatchSnapshot(payload)).rejects.toThrow(
      'MATCH_SNAPSHOT has ambiguous winner: conflicting first_blood flags',
    );
    expect(mockedFindUnique).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });
});
