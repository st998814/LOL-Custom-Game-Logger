import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../db/prisma.js';
import { persistMatchSnapshot } from './matchSnapshot.service.js';
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
});
