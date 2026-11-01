import type { Player } from '../../generated/prisma/client.js';
import {
  findMatchPlayersByPlayerId,
  findPlayerByTgId,
  type MatchPlayerWithMatchAndSiblings,
} from '../models/stats.model.js';
import type {
  AllTimeStats,
  AverageStats,
  ChampionStats,
  DateStats,
  StatsMatchLine,
  StatsOpponent,
  TopmostStats,
  WinReasonCounts,
  WinReasonKey,
} from '../types/type.stats.js';

const CS_WIN_THRESHOLD = 100;
const WIN_REASON_ORDER: WinReasonKey[] = ['firstBlood', 'firstTower', 'cs'];

type Evidence = {
  firstBlood: boolean;
  firstTower: boolean;
  totalCs: number;
};

function deriveWinReason(evidence: Evidence): string | undefined {
  const reasons: string[] = [];
  if (evidence.firstBlood) reasons.push('firstBlood');
  if (evidence.firstTower) reasons.push('firstTower');
  if (evidence.totalCs >= CS_WIN_THRESHOLD) reasons.push('cs');
  return reasons.length > 0 ? reasons.join(', ') : undefined;
}

function toOpponent(player: {
  gameName: string | null;
  tagLine: string | null;
}): StatsOpponent {
  return {
    gameName: player.gameName,
    tagLine: player.tagLine,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildMatchLine(row: MatchPlayerWithMatchAndSiblings): StatsMatchLine {
  const siblings = row.match.matchPlayers;
  const opponentRow = siblings.find(
    (sibling) => sibling.playerId !== row.playerId,
  );

  if (!opponentRow) {
    throw new Error(`Match ${row.gameId} is missing opponent MatchPlayer`);
  }

  const won = row.teamId === row.match.winningTeamId;
  const winnerEvidence = won
    ? {
        firstBlood: row.firstBlood,
        firstTower: row.firstTower,
        totalCs: row.totalCs,
      }
    : {
        firstBlood: opponentRow.firstBlood,
        firstTower: opponentRow.firstTower,
        totalCs: opponentRow.totalCs,
      };

  const line: StatsMatchLine = {
    gameId: row.gameId,
    gameCreationDate: row.match.gameCreationDate.toISOString(),
    gameDuration: row.match.gameDuration,
    won,
    opponent: toOpponent(opponentRow.player),
    myChampionId: row.championId,
    opponentChampionId: opponentRow.championId,
    firstBlood: row.firstBlood,
    firstTower: row.firstTower,
    totalCs: row.totalCs,
  };

  const winReason = deriveWinReason(winnerEvidence);
  if (winReason) {
    line.winReason = winReason;
  }

  return line;
}

function aggregateWinsLosses(lines: StatsMatchLine[]): {
  wins: number;
  losses: number;
} {
  let wins = 0;
  let losses = 0;
  for (const line of lines) {
    if (line.won) wins += 1;
    else losses += 1;
  }
  return { wins, losses };
}

function emptyWinReasons(): WinReasonCounts {
  return { firstBlood: 0, firstTower: 0, cs: 0 };
}

function addWinReasonBuckets(counts: WinReasonCounts, line: StatsMatchLine) {
  if (!line.won) return;
  if (line.firstBlood) counts.firstBlood += 1;
  if (line.firstTower) counts.firstTower += 1;
  if (line.totalCs >= CS_WIN_THRESHOLD) counts.cs += 1;
}

function playerIdentity(player: Player) {
  return {
    gameName: player.gameName,
    tagLine: player.tagLine,
  };
}

async function loadMatchLines(playerId: string): Promise<StatsMatchLine[]> {
  const rows = await findMatchPlayersByPlayerId(playerId);
  return rows.map(buildMatchLine);
}

async function resolvePlayerLines(
  tgId: bigint,
): Promise<{ player: Player; lines: StatsMatchLine[] } | null> {
  const player = await findPlayerByTgId(tgId);
  if (!player) return null;
  const lines = await loadMatchLines(player.playerId);
  return { player, lines };
}

function aggregateAverage(lines: StatsMatchLine[]): Omit<
  AverageStats,
  'gameName' | 'tagLine'
> {
  const games = lines.length;
  if (games === 0) {
    return {
      winRate: 0,
      avgDurationSec: 0,
      avgFirstBloodRate: 0,
      avgFirstTowerRate: 0,
      avgCs: 0,
    };
  }

  const { wins } = aggregateWinsLosses(lines);
  let durationSum = 0;
  let fbCount = 0;
  let ftCount = 0;
  let csSum = 0;

  for (const line of lines) {
    durationSum += line.gameDuration;
    if (line.firstBlood) fbCount += 1;
    if (line.firstTower) ftCount += 1;
    csSum += line.totalCs;
  }

  return {
    winRate: round1((wins / games) * 100),
    avgDurationSec: Math.round(durationSum / games),
    avgFirstBloodRate: round1((fbCount / games) * 100),
    avgFirstTowerRate: round1((ftCount / games) * 100),
    avgCs: round1(csSum / games),
  };
}

function pickMostSelectedChampion(lines: StatsMatchLine[]): number | null {
  if (lines.length === 0) return null;

  const byChamp = new Map<number, { count: number; latest: string }>();
  for (const line of lines) {
    const existing = byChamp.get(line.myChampionId);
    if (!existing) {
      byChamp.set(line.myChampionId, {
        count: 1,
        latest: line.gameCreationDate,
      });
      continue;
    }
    existing.count += 1;
    if (line.gameCreationDate > existing.latest) {
      existing.latest = line.gameCreationDate;
    }
  }

  let bestId: number | null = null;
  let bestCount = -1;
  let bestLatest = '';

  for (const [championId, stats] of byChamp) {
    if (
      stats.count > bestCount ||
      (stats.count === bestCount && stats.latest > bestLatest)
    ) {
      bestId = championId;
      bestCount = stats.count;
      bestLatest = stats.latest;
    }
  }

  return bestId;
}

function pickMostCommonWinReason(lines: StatsMatchLine[]): WinReasonKey | null {
  const counts = emptyWinReasons();
  const latestByReason: Record<WinReasonKey, string> = {
    firstBlood: '',
    firstTower: '',
    cs: '',
  };

  let anyWin = false;
  for (const line of lines) {
    if (!line.won) continue;
    anyWin = true;
    if (line.firstBlood) {
      counts.firstBlood += 1;
      if (line.gameCreationDate > latestByReason.firstBlood) {
        latestByReason.firstBlood = line.gameCreationDate;
      }
    }
    if (line.firstTower) {
      counts.firstTower += 1;
      if (line.gameCreationDate > latestByReason.firstTower) {
        latestByReason.firstTower = line.gameCreationDate;
      }
    }
    if (line.totalCs >= CS_WIN_THRESHOLD) {
      counts.cs += 1;
      if (line.gameCreationDate > latestByReason.cs) {
        latestByReason.cs = line.gameCreationDate;
      }
    }
  }

  if (!anyWin) return null;

  let best: WinReasonKey | null = null;
  let bestCount = 0;
  let bestLatest = '';

  for (const reason of WIN_REASON_ORDER) {
    const count = counts[reason];
    const latest = latestByReason[reason];
    if (count === 0) continue;
    if (
      best === null ||
      count > bestCount ||
      (count === bestCount && latest > bestLatest)
    ) {
      best = reason;
      bestCount = count;
      bestLatest = latest;
    }
  }

  return best;
}

/**
 * Parse `yy/mm/dd` as a UTC calendar day. Year is 2000 + yy.
 * Returns null when the string is malformed or not a real calendar date.
 */
function parseStatsDate(
  date: string,
): { start: Date; end: Date; normalized: string } | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(date.trim());
  if (!match) return null;

  const yy = Number(match[1]);
  const mm = Number(match[2]);
  const dd = Number(match[3]);
  const year = 2000 + yy;

  const start = new Date(Date.UTC(year, mm - 1, dd));
  if (
    start.getUTCFullYear() !== year ||
    start.getUTCMonth() !== mm - 1 ||
    start.getUTCDate() !== dd
  ) {
    return null;
  }

  const end = new Date(Date.UTC(year, mm - 1, dd + 1));
  const normalized = `${String(yy).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${String(dd).padStart(2, '0')}`;
  return { start, end, normalized };
}

function linesOnUtcDay(
  lines: StatsMatchLine[],
  start: Date,
  end: Date,
): StatsMatchLine[] {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return lines.filter((line) => {
    const t = Date.parse(line.gameCreationDate);
    return t >= startMs && t < endMs;
  });
}

async function getAllTimeStats(tgId: bigint): Promise<AllTimeStats | null> {
  const resolved = await resolvePlayerLines(tgId);
  if (!resolved) return null;

  const { wins, losses } = aggregateWinsLosses(resolved.lines);
  return {
    ...playerIdentity(resolved.player),
    wins,
    losses,
  };
}

async function getAverageStats(tgId: bigint): Promise<AverageStats | null> {
  const resolved = await resolvePlayerLines(tgId);
  if (!resolved) return null;

  return {
    ...playerIdentity(resolved.player),
    ...aggregateAverage(resolved.lines),
  };
}

async function getTopmostStats(tgId: bigint): Promise<TopmostStats | null> {
  const resolved = await resolvePlayerLines(tgId);
  if (!resolved) return null;

  return {
    ...playerIdentity(resolved.player),
    mostSelectedChampionId: pickMostSelectedChampion(resolved.lines),
    mostCommonWinReason: pickMostCommonWinReason(resolved.lines),
  };
}

async function getChampionStats(
  tgId: bigint,
  championId: number,
): Promise<ChampionStats | null> {
  const resolved = await resolvePlayerLines(tgId);
  if (!resolved) return null;

  const lines = resolved.lines.filter((line) => line.myChampionId === championId);
  const { wins, losses } = aggregateWinsLosses(lines);
  const winReasons = emptyWinReasons();
  for (const line of lines) {
    addWinReasonBuckets(winReasons, line);
  }

  return {
    ...playerIdentity(resolved.player),
    championId,
    games: lines.length,
    wins,
    losses,
    winReasons,
  };
}

async function getDateStats(
  tgId: bigint,
  date: string,
): Promise<DateStats | null> {
  const parsed = parseStatsDate(date);
  if (!parsed) {
    throw new Error('Invalid date; expected yy/mm/dd');
  }

  const resolved = await resolvePlayerLines(tgId);
  if (!resolved) return null;

  const lines = linesOnUtcDay(resolved.lines, parsed.start, parsed.end);
  const { wins, losses } = aggregateWinsLosses(lines);

  return {
    ...playerIdentity(resolved.player),
    date: parsed.normalized,
    games: lines.length,
    wins,
    losses,
  };
}

export {
  CS_WIN_THRESHOLD,
  deriveWinReason,
  buildMatchLine,
  aggregateWinsLosses,
  aggregateAverage,
  pickMostSelectedChampion,
  pickMostCommonWinReason,
  parseStatsDate,
  getAllTimeStats,
  getAverageStats,
  getTopmostStats,
  getChampionStats,
  getDateStats,
};
