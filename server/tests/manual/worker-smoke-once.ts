import 'dotenv/config';
import { readFileSync } from 'node:fs';

import prisma from '../../src/db/prisma.js';
import { processBatch } from '../../src/workers/rawEventProcessor.js';

async function main(): Promise<void> {
  const gameId = 972_000_000 + Math.floor(Math.random() * 999_999);
  const payload = JSON.parse(
    readFileSync('tests/fixtures/match-snapshot.json', 'utf8'),
  ) as Record<string, unknown>;
  const match = payload.match as Record<string, unknown>;
  match.game_id = gameId;

  const event = await prisma.rawEvent.create({
    data: {
      eventType: 'MATCH_SNAPSHOT',
      payload,
      deduplicationKey: `MATCH_SNAPSHOT:${gameId}`,
      status: 'PENDING',
    },
  });

  await processBatch();

  const updated = await prisma.rawEvent.findUnique({ where: { id: event.id } });
  const persistedMatch = await prisma.match.findUnique({ where: { gameId } });
  const matchPlayers = await prisma.matchPlayer.findMany({
    where: { gameId },
    orderBy: { participantId: 'asc' },
    include: { player: true },
  });

  console.log(
    JSON.stringify(
      {
        gameId,
        rawEventId: String(event.id),
        rawEventStatus: updated?.status,
        processedAt: updated?.processedAt?.toISOString() ?? null,
        match: persistedMatch
          ? {
              gameId: persistedMatch.gameId,
              gameDuration: persistedMatch.gameDuration,
              gameCreationDate: persistedMatch.gameCreationDate.toISOString(),
            }
          : null,
        matchPlayerCount: matchPlayers.length,
        players: matchPlayers.map((row) => ({
          participantId: row.participantId,
          teamId: row.teamId,
          championId: row.championId,
          puuid: row.player.puuid,
          gameName: row.player.gameName,
          tagLine: row.player.tagLine,
        })),
      },
      null,
      2,
    ),
  );

  await prisma.match.deleteMany({ where: { gameId } });
  await prisma.rawEvent.delete({ where: { id: event.id } });
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
