import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MatchPlayerWithMatchAndSiblings } from '../models/stats.model.js';
import type { StatsMatchLine } from '../types/type.stats.js';

const { findPlayerByPuuid, findMatchPlayersByPlayerId } = vi.hoisted(() => ({
  findPlayerByPuuid: vi.fn(),
  findMatchPlayersByPlayerId: vi.fn(),
}));

vi.mock('../models/stats.model.js', () => ({
  findPlayerByPuuid,
  findMatchPlayersByPlayerId,
}));

const {
  aggregateByOpponent,
  aggregateWinsLosses,
  buildMatchLine,
  deriveWinReason,
  getAllTimeStats,
  getDetailedStats,
  getRecentStats,
  RECENT_LIMIT,
} = await import('./stats.service.js');

function matchLine(overrides: Partial<StatsMatchLine> = {}): StatsMatchLine {
  return {
    gameId: 1,
    gameCreationDate: '2026-03-16T00:00:00.000Z',
    won: true,
    opponent: { gameName: 'Rival', tagLine: 'NA1' },
    myChampionId: 54,
    opponentChampionId: 99,
    ...overrides,
  };
}

function playerRow(overrides: {
  playerId?: string;
  teamId: number;
  championId?: number;
  firstBlood?: boolean;
  firstTower?: boolean;
  totalCs?: number;
  gameName?: string | null;
  tagLine?: string | null;
}) {
  const playerId = overrides.playerId ?? 'me-id';
  return {
    gameId: 1001,
    participantId: overrides.teamId === 100 ? 1 : 2,
    playerId,
    teamId: overrides.teamId,
    championId: overrides.championId ?? 54,
    firstBlood: overrides.firstBlood ?? false,
    firstTower: overrides.firstTower ?? false,
    totalCs: overrides.totalCs ?? 0,
    createdAt: new Date('2026-03-16T00:00:00.000Z'),
    player: {
      playerId,
      puuid: playerId === 'me-id' ? 'puuid-me' : 'puuid-opp',
      gameName: overrides.gameName ?? (playerId === 'me-id' ? 'Me' : 'Rival'),
      tagLine: overrides.tagLine ?? 'NA1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  };
}

function duelRow(opts: {
  gameId: number;
  gameCreationDate: string;
  winningTeamId: number;
  me: {
    teamId: number;
    championId?: number;
    firstBlood?: boolean;
    firstTower?: boolean;
    totalCs?: number;
  };
  opponent: {
    teamId: number;
    championId?: number;
    firstBlood?: boolean;
    firstTower?: boolean;
    totalCs?: number;
    gameName?: string;
    tagLine?: string;
  };
}): MatchPlayerWithMatchAndSiblings {
  const me = playerRow({ playerId: 'me-id', ...opts.me });
  const opp = playerRow({
    playerId: 'opp-id',
    ...opts.opponent,
  });
  const matchPlayers = [me, opp];
  const match = {
    gameId: opts.gameId,
    gameDuration: 600,
    gameCreationDate: new Date(opts.gameCreationDate),
    winningTeamId: opts.winningTeamId,
    createdAt: new Date(opts.gameCreationDate),
    matchPlayers,
  };

  return {
    ...me,
    gameId: opts.gameId,
    match: {
      ...match,
      matchPlayers: matchPlayers.map((row) => ({
        ...row,
        gameId: opts.gameId,
        match: undefined as never,
      })),
    },
  } as MatchPlayerWithMatchAndSiblings;
}

describe('deriveWinReason', () => {
  it('returns undefined when no evidence qualifies', () => {
    expect(
      deriveWinReason({ firstBlood: false, firstTower: false, totalCs: 50 }),
    ).toBeUndefined();
  });

  it('joins multiple qualifying reasons', () => {
    expect(
      deriveWinReason({ firstBlood: true, firstTower: true, totalCs: 120 }),
    ).toBe('firstBlood, firstTower, cs');
  });
});

describe('aggregateWinsLosses', () => {
  it('counts wins and losses from match lines', () => {
    expect(
      aggregateWinsLosses([
        matchLine({ won: true }),
        matchLine({ won: false }),
        matchLine({ won: true }),
      ]),
    ).toEqual({ wins: 2, losses: 1 });
  });

  it('returns zeros for empty history', () => {
    expect(aggregateWinsLosses([])).toEqual({ wins: 0, losses: 0 });
  });
});

describe('aggregateByOpponent', () => {
  it('groups W-L by opponent Riot id', () => {
    const lines = [
      matchLine({
        won: true,
        opponent: { gameName: 'Rival', tagLine: 'NA1' },
      }),
      matchLine({
        won: false,
        opponent: { gameName: 'Rival', tagLine: 'NA1' },
      }),
      matchLine({
        won: true,
        opponent: { gameName: 'Other', tagLine: 'EUW' },
      }),
    ];

    expect(aggregateByOpponent(lines)).toEqual([
      {
        opponent: { gameName: 'Rival', tagLine: 'NA1' },
        wins: 1,
        losses: 1,
      },
      {
        opponent: { gameName: 'Other', tagLine: 'EUW' },
        wins: 1,
        losses: 0,
      },
    ]);
  });
});

describe('buildMatchLine', () => {
  it('marks won when teamId matches winningTeamId and attaches winReason', () => {
    const row = duelRow({
      gameId: 42,
      gameCreationDate: '2026-03-16T12:00:00.000Z',
      winningTeamId: 100,
      me: { teamId: 100, championId: 54, firstBlood: true },
      opponent: { teamId: 200, championId: 99, gameName: 'Rival', tagLine: 'NA1' },
    });

    expect(buildMatchLine(row)).toEqual({
      gameId: 42,
      gameCreationDate: '2026-03-16T12:00:00.000Z',
      won: true,
      opponent: { gameName: 'Rival', tagLine: 'NA1' },
      myChampionId: 54,
      opponentChampionId: 99,
      winReason: 'firstBlood',
    });
  });

  it('marks loss when teamId differs from winningTeamId', () => {
    const row = duelRow({
      gameId: 43,
      gameCreationDate: '2026-03-17T12:00:00.000Z',
      winningTeamId: 200,
      me: { teamId: 100, championId: 1 },
      opponent: {
        teamId: 200,
        championId: 2,
        firstTower: true,
        gameName: 'Rival',
        tagLine: 'NA1',
      },
    });

    const line = buildMatchLine(row);
    expect(line.won).toBe(false);
    expect(line.winReason).toBe('firstTower');
  });
});

describe('getAllTimeStats / getRecentStats / getDetailedStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const player = {
    playerId: 'me-id',
    puuid: 'puuid-me',
    gameName: 'Me',
    tagLine: 'NA1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  function sixMatchRows() {
    return Array.from({ length: 6 }, (_, index) =>
      duelRow({
        gameId: 2000 + index,
        gameCreationDate: `2026-03-${String(16 - index).padStart(2, '0')}T00:00:00.000Z`,
        winningTeamId: index % 2 === 0 ? 100 : 200,
        me: {
          teamId: 100,
          firstBlood: index % 2 === 0,
        },
        opponent: {
          teamId: 200,
          firstTower: index % 2 === 1,
          gameName: index < 3 ? 'Rival' : 'Other',
          tagLine: 'NA1',
        },
      }),
    );
  }

  it('returns null when player puuid is unknown', async () => {
    findPlayerByPuuid.mockResolvedValue(null);

    await expect(getAllTimeStats('missing')).resolves.toBeNull();
    await expect(getRecentStats('missing')).resolves.toBeNull();
    await expect(getDetailedStats('missing')).resolves.toBeNull();
    expect(findMatchPlayersByPlayerId).not.toHaveBeenCalled();
  });

  it('returns zero W-L when player exists with no matches', async () => {
    findPlayerByPuuid.mockResolvedValue(player);
    findMatchPlayersByPlayerId.mockResolvedValue([]);

    await expect(getAllTimeStats('puuid-me')).resolves.toEqual({
      puuid: 'puuid-me',
      gameName: 'Me',
      tagLine: 'NA1',
      wins: 0,
      losses: 0,
    });
  });

  it('aggregates all-time W-L from winningTeamId vs teamId', async () => {
    findPlayerByPuuid.mockResolvedValue(player);
    findMatchPlayersByPlayerId.mockResolvedValue(sixMatchRows());

    await expect(getAllTimeStats('puuid-me')).resolves.toEqual({
      puuid: 'puuid-me',
      gameName: 'Me',
      tagLine: 'NA1',
      wins: 3,
      losses: 3,
    });
  });

  it(`returns at most ${RECENT_LIMIT} newest matches for recent`, async () => {
    findPlayerByPuuid.mockResolvedValue(player);
    findMatchPlayersByPlayerId.mockResolvedValue(sixMatchRows());

    const recent = await getRecentStats('puuid-me');
    expect(recent?.matches).toHaveLength(5);
    expect(recent?.matches.map((m) => m.gameId)).toEqual([
      2000, 2001, 2002, 2003, 2004,
    ]);
  });

  it('returns byOpponent and full match list for details', async () => {
    findPlayerByPuuid.mockResolvedValue(player);
    findMatchPlayersByPlayerId.mockResolvedValue(sixMatchRows());

    const details = await getDetailedStats('puuid-me');
    expect(details?.matches).toHaveLength(6);
    expect(details?.byOpponent).toEqual([
      {
        opponent: { gameName: 'Rival', tagLine: 'NA1' },
        wins: 2,
        losses: 1,
      },
      {
        opponent: { gameName: 'Other', tagLine: 'NA1' },
        wins: 1,
        losses: 2,
      },
    ]);
  });
});
