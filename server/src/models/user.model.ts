import prisma from '../db/prisma.js';

type PlayerLinkState = { tgId: bigint | null };

/** Returns null when no players row has this PUUID (the player is not registered). */
async function findPlayerLinkState(puuid: string): Promise<PlayerLinkState | null> {
  return prisma.player.findUnique({
    where: { puuid },
    select: { tgId: true },
  });
}

/**
 * Binds a Telegram id to an existing players row and returns its gameName.
 * Prisma errors propagate: P2025 (no row) and P2002 (tg_id already used).
 */
async function setTgIdByPuuid(puuid: string, tgId: bigint): Promise<string | null> {
  const player = await prisma.player.update({
    where: { puuid },
    data: { tgId },
    select: { gameName: true },
  });
  return player.gameName;
}

// Superseded by findPlayerLinkState / setTgIdByPuuid; removed with the service rewrite.
async function findTgIdExistedByPuuid(puuid: string): Promise<bigint | null> {
  const state = await findPlayerLinkState(puuid);
  return state?.tgId ?? null;
}

async function updateTgIdByPuuid(puuid: string, tgId: number): Promise<string | boolean> {
  const gameName = await setTgIdByPuuid(puuid, BigInt(tgId));
  return gameName ?? false;
}

export { findPlayerLinkState, setTgIdByPuuid, findTgIdExistedByPuuid, updateTgIdByPuuid };
export type { PlayerLinkState };
