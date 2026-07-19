import prisma from '../db/prisma.js';
import type { Player } from '../../generated/prisma/client.js';

type MatchPlayerWithMatchAndSiblings = Awaited<
  ReturnType<typeof findMatchPlayersByPlayerId>
>[number];

async function findPlayerByPuuid(puuid: string): Promise<Player | null> {
  return prisma.player.findUnique({
    where: { puuid },
  });
}

async function findMatchPlayersByPlayerId(playerId: string) {
  return prisma.matchPlayer.findMany({
    where: { playerId },
    include: {
      match: {
        include: {
          matchPlayers: {
            include: {
              player: true,
            },
          },
        },
      },
    },
    orderBy: {
      match: {
        gameCreationDate: 'desc',
      },
    },
  });
}

export type { MatchPlayerWithMatchAndSiblings };
export { findPlayerByPuuid, findMatchPlayersByPlayerId };
