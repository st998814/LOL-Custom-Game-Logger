import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MatchPlayerWithMatchAndSiblings } from '../models/stats.model.js';
import type { StatsMatchLine } from '../types/type.stats.js';

const { findPlayerByTgId, findMatchPlayersByPlayerId } = vi.hoisted(() => ({
  findPlayerByTgId: vi.fn(),
  findMatchPlayersByPlayerId: vi.fn(),
}));

vi.mock('../models/stats.model.js', () => ({
  findPlayerByTgId,
  findMatchPlayersByPlayerId,
}));

const {
  aggregateAverage,
  aggregateWinsLosses,
  buildMatchLine,
  deriveWinReason,
  getAllTimeStats,
  getAverageStats,
  getChampionStats,
  getDateStats,
  getTopmostStats,
  parseStatsDate,
  pickMostCommonWinReason,
  pickMostSelectedChampion,
} = await import('./stats.service.js');

const TG_ID = 6_000_000_000n;

function matchLine(overrides: Partial<StatsMatchLine> = {}): StatsMatchLine {
  return {
    gameId: 1,
    gameCreationDate: '2026-03-16T00:00:00.000Z',
    gameDuration: 600,
    won: true,
    opponent: { gameName: 'Rival', tagLine: 'NA1' },
    myChampionId: 54,
    opponentChampionId: 99,
    firstBlood: false,
    firstTower: false,
    totalCs: 0,
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
  tgId?: bigint | null;
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
      tgId: overrides.tgId ?? (playerId === 'me-id' ? TG_ID : null),
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
  gameDuration?: number;
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
    gameDuration: opts.gameDuration ?? 600,
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

const player = {
  playerId: 'me-id',
  tgId: TG_ID,
  puuid: 'puuid-me',
  gameName: 'Me',
  tagLine: 'NA1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

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

describe('buildMatchLine', () => {
  it('includes duration and own evidence on wins', () => {
    const row = duelRow({
      gameId: 42,
      gameCreationDate: '2026-03-16T12:00:00.000Z',
      gameDuration: 1285,
      winningTeamId: 100,
      me: { teamId: 100, championId: 54, firstBlood: true, totalCs: 80 },
      opponent: { teamId: 200, championId: 99, gameName: 'Rival', tagLine: 'NA1' },
    });

    expect(buildMatchLine(row)).toEqual({
      gameId: 42,
      gameCreationDate: '2026-03-16T12:00:00.000Z',
      gameDuration: 1285,
      won: true,
      opponent: { gameName: 'Rival', tagLine: 'NA1' },
      myChampionId: 54,
      opponentChampionId: 99,
      firstBlood: true,
      firstTower: false,
      totalCs: 80,
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
    expect(line.firstTower).toBe(false);
  });
});

describe('aggregateAverage', () => {
  it('returns all zeros for empty history', () => {
    expect(aggregateAverage([])).toEqual({
      winRate: 0,
      avgDurationSec: 0,
      avgFirstBloodRate: 0,
      avgFirstTowerRate: 0,
      avgCs: 0,
    });
  });

  it('computes percent rates and means with one-decimal rounding', () => {
    const lines = [
      matchLine({
        won: true,
        gameDuration: 600,
        firstBlood: true,
        firstTower: false,
        totalCs: 50,
      }),
      matchLine({
        won: false,
        gameDuration: 700,
        firstBlood: false,
        firstTower: true,
        totalCs: 100,
      }),
      matchLine({
        won: true,
        gameDuration: 650,
        firstBlood: true,
        firstTower: true,
        totalCs: 75,
      }),
    ];

    // winRate 2/3 -> 66.666... -> 66.7
    // duration (600+700+650)/3 = 650
    // FB 2/3 -> 66.7, FT 2/3 -> 66.7, CS (50+100+75)/3 = 75
    expect(aggregateAverage(lines)).toEqual({
      winRate: 66.7,
      avgDurationSec: 650,
      avgFirstBloodRate: 66.7,
      avgFirstTowerRate: 66.7,
      avgCs: 75,
    });
  });
});

describe('pickMostSelectedChampion / pickMostCommonWinReason', () => {
  it('returns nulls for empty history', () => {
    expect(pickMostSelectedChampion([])).toBeNull();
    expect(pickMostCommonWinReason([])).toBeNull();
  });

  it('returns null win reason when there are games but no wins', () => {
    const lines = [
      matchLine({ won: false, myChampionId: 54, firstBlood: true }),
      matchLine({ won: false, myChampionId: 54 }),
    ];
    expect(pickMostSelectedChampion(lines)).toBe(54);
    expect(pickMostCommonWinReason(lines)).toBeNull();
  });

  it('breaks champion ties by most recent gameCreationDate', () => {
    const lines = [
      matchLine({
        myChampionId: 1,
        gameCreationDate: '2026-03-10T00:00:00.000Z',
      }),
      matchLine({
        myChampionId: 2,
        gameCreationDate: '2026-03-16T00:00:00.000Z',
      }),
    ];
    expect(pickMostSelectedChampion(lines)).toBe(2);
  });

  it('counts multi-bucket win reasons and breaks ties by most recent win', () => {
    const lines = [
      matchLine({
        won: true,
        firstBlood: true,
        firstTower: true,
        totalCs: 120,
        gameCreationDate: '2026-03-10T00:00:00.000Z',
      }),
      matchLine({
        won: true,
        firstBlood: true,
        firstTower: false,
        totalCs: 0,
        gameCreationDate: '2026-03-16T00:00:00.000Z',
      }),
    ];
    // FB:2, FT:1, cs:1 — FB wins on count
    expect(pickMostCommonWinReason(lines)).toBe('firstBlood');
  });

  it('breaks equal win-reason counts by most recent contributing win', () => {
    const lines = [
      matchLine({
        won: true,
        firstBlood: true,
        gameCreationDate: '2026-03-10T00:00:00.000Z',
      }),
      matchLine({
        won: true,
        firstTower: true,
        gameCreationDate: '2026-03-16T00:00:00.000Z',
      }),
    ];
    expect(pickMostCommonWinReason(lines)).toBe('firstTower');
  });
});

describe('parseStatsDate', () => {
  it('parses a valid UTC calendar day', () => {
    const parsed = parseStatsDate('26/03/16');
    expect(parsed).toEqual({
      start: new Date('2026-03-16T00:00:00.000Z'),
      end: new Date('2026-03-17T00:00:00.000Z'),
      normalized: '26/03/16',
    });
  });

  it('rejects malformed or impossible dates', () => {
    expect(parseStatsDate('2026-03-16')).toBeNull();
    expect(parseStatsDate('26/13/01')).toBeNull();
    expect(parseStatsDate('26/02/30')).toBeNull();
    expect(parseStatsDate('')).toBeNull();
  });
});

describe('getAllTimeStats / getAverageStats / getTopmostStats / getChampionStats / getDateStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function historyRows() {
    return [
      duelRow({
        gameId: 1,
        gameCreationDate: '2026-03-16T12:00:00.000Z',
        gameDuration: 600,
        winningTeamId: 100,
        me: {
          teamId: 100,
          championId: 54,
          firstBlood: true,
          firstTower: true,
          totalCs: 120,
        },
        opponent: { teamId: 200, championId: 99 },
      }),
      duelRow({
        gameId: 2,
        gameCreationDate: '2026-03-16T18:00:00.000Z',
        gameDuration: 700,
        winningTeamId: 200,
        me: { teamId: 100, championId: 54, totalCs: 40 },
        opponent: { teamId: 200, championId: 10, firstTower: true },
      }),
      duelRow({
        gameId: 3,
        gameCreationDate: '2026-03-17T01:00:00.000Z',
        gameDuration: 650,
        winningTeamId: 100,
        me: { teamId: 100, championId: 86, firstBlood: true, totalCs: 50 },
        opponent: { teamId: 200, championId: 11 },
      }),
    ];
  }

  it('returns null when tgId is unknown for all readers', async () => {
    findPlayerByTgId.mockResolvedValue(null);

    await expect(getAllTimeStats(999n)).resolves.toBeNull();
    await expect(getAverageStats(999n)).resolves.toBeNull();
    await expect(getTopmostStats(999n)).resolves.toBeNull();
    await expect(getChampionStats(999n, 54)).resolves.toBeNull();
    await expect(getDateStats(999n, '26/03/16')).resolves.toBeNull();
    expect(findMatchPlayersByPlayerId).not.toHaveBeenCalled();
  });

  it('returns zero / null empty slices for a linked player with no matches', async () => {
    findPlayerByTgId.mockResolvedValue(player);
    findMatchPlayersByPlayerId.mockResolvedValue([]);

    await expect(getAllTimeStats(TG_ID)).resolves.toEqual({
      gameName: 'Me',
      tagLine: 'NA1',
      wins: 0,
      losses: 0,
    });
    await expect(getAverageStats(TG_ID)).resolves.toEqual({
      gameName: 'Me',
      tagLine: 'NA1',
      winRate: 0,
      avgDurationSec: 0,
      avgFirstBloodRate: 0,
      avgFirstTowerRate: 0,
      avgCs: 0,
    });
    await expect(getTopmostStats(TG_ID)).resolves.toEqual({
      gameName: 'Me',
      tagLine: 'NA1',
      mostSelectedChampionId: null,
      mostCommonWinReason: null,
    });
    await expect(getChampionStats(TG_ID, 54)).resolves.toEqual({
      gameName: 'Me',
      tagLine: 'NA1',
      championId: 54,
      games: 0,
      wins: 0,
      losses: 0,
      winReasons: { firstBlood: 0, firstTower: 0, cs: 0 },
    });
    await expect(getDateStats(TG_ID, '26/03/16')).resolves.toEqual({
      gameName: 'Me',
      tagLine: 'NA1',
      date: '26/03/16',
      games: 0,
      wins: 0,
      losses: 0,
    });
  });

  it('aggregates average, topmost, champion, and date from match history', async () => {
    findPlayerByTgId.mockResolvedValue(player);
    findMatchPlayersByPlayerId.mockResolvedValue(historyRows());

    await expect(getAverageStats(TG_ID)).resolves.toEqual({
      gameName: 'Me',
      tagLine: 'NA1',
      winRate: 66.7,
      avgDurationSec: 650,
      avgFirstBloodRate: 66.7,
      avgFirstTowerRate: 33.3,
      avgCs: 70,
    });

    await expect(getTopmostStats(TG_ID)).resolves.toEqual({
      gameName: 'Me',
      tagLine: 'NA1',
      mostSelectedChampionId: 54,
      mostCommonWinReason: 'firstBlood',
    });

    await expect(getChampionStats(TG_ID, 54)).resolves.toEqual({
      gameName: 'Me',
      tagLine: 'NA1',
      championId: 54,
      games: 2,
      wins: 1,
      losses: 1,
      winReasons: { firstBlood: 1, firstTower: 1, cs: 1 },
    });

    await expect(getDateStats(TG_ID, '26/03/16')).resolves.toEqual({
      gameName: 'Me',
      tagLine: 'NA1',
      date: '26/03/16',
      games: 2,
      wins: 1,
      losses: 1,
    });
  });

  it('throws on invalid date input', async () => {
    findPlayerByTgId.mockResolvedValue(player);
    await expect(getDateStats(TG_ID, 'not-a-date')).rejects.toThrow(
      /Invalid date/,
    );
  });
});
