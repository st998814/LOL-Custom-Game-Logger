import type { Player } from '../../generated/prisma/client.js';
import {
  findMatchPlayersByPlayerId,
  findPlayerByTgId,
  type MatchPlayerWithMatchAndSiblings,
} from '../models/stats.model.js';
import type { AllTimeStats, StatsMatchLine, StatsOpponent } from '../types/type.stats.js';

const CS_WIN_THRESHOLD = 100;

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

async function getAllTimeStats(tgId: bigint): Promise<AllTimeStats | null> {
  const player = await findPlayerByTgId(tgId);
  if (!player) return null;

  const lines = await loadMatchLines(player.playerId);
  const { wins, losses } = aggregateWinsLosses(lines);

  return {
    ...playerIdentity(player),
    wins,
    losses,
  };
}

export {
  CS_WIN_THRESHOLD,
  deriveWinReason,
  buildMatchLine,
  aggregateWinsLosses,
  getAllTimeStats,
};
