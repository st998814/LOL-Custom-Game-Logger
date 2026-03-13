import prisma from '../db/prisma.js';
import type { RawEvent } from '../../generated/prisma/client.js';
import {
  getPendingEventsBatch,
  markEventsProcessing,
  markEventProcessed,
  markEventFailed,
  markEventPendingForRetry,
} from '../models/rawEvent.model.js';

const BATCH_SIZE = 20;
const POLL_INTERVAL_MS = 2_000;
const MAX_RETRIES = 5;

type MatchSnapshotPayload = {
  match?: {
    game_id?: number;
    game_duration?: number;
    game_creation_date?: string;
    gameId?: number;
    gameDuration?: number;
    gameCreationDate?: string;
  };
  players?: Array<{
    participant_id?: number;
    team_id?: number;
    puuid?: string | null;
    game_name?: string | null;
    tag_line?: string | null;
    champion_id?: number;
    first_blood?: boolean;
    first_tower?: boolean;
    total_cs?: number;
  }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asMatchSnapshotPayload(payload: unknown): MatchSnapshotPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('MATCH_SNAPSHOT payload must be an object');
  }

  return payload as MatchSnapshotPayload;
}

async function ingestMatchSnapshot(payload: unknown): Promise<void> {
  const body = asMatchSnapshotPayload(payload);

  const match = body.match;
  const players = body.players;

  if (!match) {
    throw new Error('MATCH_SNAPSHOT payload is missing "match" field');
  }

  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('MATCH_SNAPSHOT payload is missing "players" array');
  }

  const gameId =
    typeof match.game_id === 'number'
      ? match.game_id
      : typeof match.gameId === 'number'
        ? match.gameId
        : null;

  const gameDuration =
    typeof match.game_duration === 'number'
      ? match.game_duration
      : typeof match.gameDuration === 'number'
        ? match.gameDuration
        : null;

  const gameCreationDateStr =
    typeof match.game_creation_date === 'string'
      ? match.game_creation_date
      : typeof match.gameCreationDate === 'string'
        ? match.gameCreationDate
        : null;

  if (gameId === null || gameDuration === null || gameCreationDateStr === null) {
    throw new Error('MATCH_SNAPSHOT payload is missing basic match fields');
  }

  const gameCreationDate = new Date(gameCreationDateStr);
  if (Number.isNaN(gameCreationDate.getTime())) {
    throw new Error('MATCH_SNAPSHOT payload has invalid game_creation_date');
  }

  await prisma.$transaction(async (tx) => {
    // Upsert match row
    await tx.match.upsert({
      where: { gameId },
      update: {
        gameDuration,
        gameCreationDate,
      },
      create: {
        gameId,
        gameDuration,
        gameCreationDate,
      },
    });

    for (const player of players) {
      if (!player) continue;

      const participantId =
        typeof player.participant_id === 'number' ? player.participant_id : null;
      const teamId =
        typeof player.team_id === 'number' ? player.team_id : null;
      const championId =
        typeof player.champion_id === 'number' ? player.champion_id : null;
      const firstBlood =
        typeof player.first_blood === 'boolean' ? player.first_blood : false;
      const firstTower =
        typeof player.first_tower === 'boolean' ? player.first_tower : false;
      const totalCs =
        typeof player.total_cs === 'number' ? player.total_cs : 0;

      if (participantId === null || teamId === null || championId === null) {
        // Skip obviously malformed entries, but keep processing others
        // eslint-disable-next-line no-continue
        continue;
      }

      const rawPuuid =
        typeof player.puuid === 'string' ? player.puuid.trim() : null;
      const normalizedPuuid =
        rawPuuid && rawPuuid !== '' && !/^0+$/.test(rawPuuid) ? rawPuuid : null;

      const gameName =
        typeof player.game_name === 'string' ? player.game_name : null;
      const tagLine =
        typeof player.tag_line === 'string' ? player.tag_line : null;

      // Upsert or create player
      let dbPlayer;
      if (normalizedPuuid) {
        dbPlayer = await tx.player.upsert({
          where: { puuid: normalizedPuuid },
          update: {
            gameName,
            tagLine,
          },
          create: {
            puuid: normalizedPuuid,
            gameName,
            tagLine,
          },
        });
      } else {
        dbPlayer = await tx.player.create({
          data: {
            puuid: null,
            gameName,
            tagLine,
          },
        });
      }

      await tx.matchPlayer.upsert({
        where: {
          gameId_participantId: {
            gameId,
            participantId,
          },
        },
        update: {
          playerId: dbPlayer.playerId,
          teamId,
          championId,
          firstBlood,
          firstTower,
          totalCs,
        },
        create: {
          gameId,
          participantId,
          playerId: dbPlayer.playerId,
          teamId,
          championId,
          firstBlood,
          firstTower,
          totalCs,
        },
      });
    }
  });
}

async function processSingleEvent(event: RawEvent): Promise<void> {
  if (event.eventType === 'MATCH_SNAPSHOT') {
    await ingestMatchSnapshot(event.payload);
    return;
  }

  // Unknown event types are treated as a permanent failure for now
  throw new Error(`Unsupported eventType: ${event.eventType}`);
}

async function processBatch(): Promise<void> {
  const events = await getPendingEventsBatch(BATCH_SIZE);
  if (events.length === 0) {
    return;
  }

  const ids = events.map((event) => event.id);

  await markEventsProcessing(ids);

  for (const event of events) {
    try {
      await processSingleEvent(event);
      await markEventProcessed(event.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown processing error';

      const attemptCount = (event.retryCount ?? 0) + 1;
      const hasMoreRetries = attemptCount < MAX_RETRIES;

      if (hasMoreRetries) {
        await markEventPendingForRetry(event.id, message);
      } else {
        await markEventFailed(event.id, message);
      }
    }
  }
}

async function startRawEventProcessorLoop(): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await processBatch();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('RawEventProcessor batch failed', error);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

export { startRawEventProcessorLoop };

