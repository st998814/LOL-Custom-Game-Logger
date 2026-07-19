import type { Player } from '../../generated/prisma/client.js';
import {
  findMatchPlayersByPlayerId,
  findPlayerByPuuid,
  type MatchPlayerWithMatchAndSiblings,
} from '../models/stats.model.js';
import type {
  AllTimeStats,
  DetailedStats,
  OpponentRecord,
  RecentStats,
  StatsMatchLine,
  StatsOpponent,
} from '../types/type.stats.js';

const CS_WIN_THRESHOLD = 100;
const RECENT_LIMIT = 5;

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

function opponentKey(opponent: StatsOpponent): string {
  return `${opponent.gameName ?? ''}#${opponent.tagLine ?? ''}`;
}

function buildMatchLine(
  row: MatchPlayerWithMatchAndSiblings,
): StatsMatchLine {
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
    won,
    opponent: toOpponent(opponentRow.player),
    myChampionId: row.championId,
    opponentChampionId: opponentRow.championId,
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

function aggregateByOpponent(lines: StatsMatchLine[]): OpponentRecord[] {
  const byKey = new Map<string, OpponentRecord>();

  for (const line of lines) {
    const key = opponentKey(line.opponent);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        opponent: line.opponent,
        wins: line.won ? 1 : 0,
        losses: line.won ? 0 : 1,
      });
      continue;
    }
    if (line.won) existing.wins += 1;
    else existing.losses += 1;
  }

  return [...byKey.values()];
}

function playerIdentity(player: Player) {
  return {
    puuid: player.puuid as string,
    gameName: player.gameName,
    tagLine: player.tagLine,
  };
}

async function loadMatchLines(playerId: string): Promise<StatsMatchLine[]> {
  const rows = await findMatchPlayersByPlayerId(playerId);
  return rows.map(buildMatchLine);
}

async function getAllTimeStats(puuid: string): Promise<AllTimeStats | null> {
  const player = await findPlayerByPuuid(puuid);
  if (!player || !player.puuid) return null;

  const lines = await loadMatchLines(player.playerId);
  const { wins, losses } = aggregateWinsLosses(lines);

  return {
    ...playerIdentity(player),
    wins,
    losses,
  };
}

async function getRecentStats(
  puuid: string,
  limit: number = RECENT_LIMIT,
): Promise<RecentStats | null> {
  const player = await findPlayerByPuuid(puuid);
  if (!player || !player.puuid) return null;

  const lines = await loadMatchLines(player.playerId);

  return {
    ...playerIdentity(player),
    matches: lines.slice(0, limit),
  };
}

async function getDetailedStats(puuid: string): Promise<DetailedStats | null> {
  const player = await findPlayerByPuuid(puuid);
  if (!player || !player.puuid) return null;

  const lines = await loadMatchLines(player.playerId);

  return {
    ...playerIdentity(player),
    byOpponent: aggregateByOpponent(lines),
    matches: lines,
  };
}

export {
  CS_WIN_THRESHOLD,
  RECENT_LIMIT,
  deriveWinReason,
  buildMatchLine,
  aggregateWinsLosses,
  aggregateByOpponent,
  getAllTimeStats,
  getRecentStats,
  getDetailedStats,
};
