import prisma from '../db/prisma.js';

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

type ParsedMatch = {
  gameId: number;
  gameDuration: number;
  gameCreationDate: Date;
};

type ParsedPlayer = {
  participantId: number;
  teamId: number;
  championId: number;
  normalizedPuuid: string | null;
  gameName: string | null;
  tagLine: string | null;
  firstBlood: boolean;
  firstTower: boolean;
  totalCs: number;
};

function asMatchSnapshotPayload(payload: unknown): MatchSnapshotPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('MATCH_SNAPSHOT payload must be an object');
  }

  return payload as MatchSnapshotPayload;
}

function parseMatchFields(
  match: MatchSnapshotPayload['match'],
): ParsedMatch {
  if (!match) {
    throw new Error('MATCH_SNAPSHOT payload is missing "match" field');
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

  return { gameId, gameDuration, gameCreationDate };
}

function parsePlayers(
  players: MatchSnapshotPayload['players'],
): ParsedPlayer[] {
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('MATCH_SNAPSHOT payload is missing "players" array');
  }

  const parsed: ParsedPlayer[] = [];

  for (const player of players) {
    if (!player) {
      continue;
    }

    const participantId =
      typeof player.participant_id === 'number' ? player.participant_id : null;
    const teamId = typeof player.team_id === 'number' ? player.team_id : null;
    const championId =
      typeof player.champion_id === 'number' ? player.champion_id : null;

    if (participantId === null || teamId === null || championId === null) {
      continue;
    }

    const rawPuuid =
      typeof player.puuid === 'string' ? player.puuid.trim() : null;
    const normalizedPuuid =
      rawPuuid && rawPuuid !== '' && !/^0+$/.test(rawPuuid) ? rawPuuid : null;

    parsed.push({
      participantId,
      teamId,
      championId,
      normalizedPuuid,
      gameName: typeof player.game_name === 'string' ? player.game_name : null,
      tagLine: typeof player.tag_line === 'string' ? player.tag_line : null,
      firstBlood:
        typeof player.first_blood === 'boolean' ? player.first_blood : false,
      firstTower:
        typeof player.first_tower === 'boolean' ? player.first_tower : false,
      totalCs: typeof player.total_cs === 'number' ? player.total_cs : 0,
    });
  }

  return parsed;
}

async function persistMatchSnapshot(payload: unknown): Promise<void> {
  const body = asMatchSnapshotPayload(payload);
  const { gameId, gameDuration, gameCreationDate } = parseMatchFields(body.match);
  const parsedPlayers = parsePlayers(body.players);

  if (parsedPlayers.length < 2) {
    throw new Error(
      'MATCH_SNAPSHOT must produce exactly 2 valid match_players',
    );
  }

  const teamIds = parsedPlayers.map((player) => player.teamId);
  if (new Set(teamIds).size !== teamIds.length) {
    throw new Error(
      'MATCH_SNAPSHOT must not have duplicate team_id values',
    );
  }

  const existingMatch = await prisma.match.findUnique({
    where: { gameId },
  });

  if (existingMatch) {
    throw new Error(`Match already exists for game_id ${gameId}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.match.create({
      data: {
        gameId,
        gameDuration,
        gameCreationDate,
      },
    });

    for (const player of parsedPlayers) {
      const dbPlayer = player.normalizedPuuid
        ? await tx.player.upsert({
            where: { puuid: player.normalizedPuuid },
            update: {
              gameName: player.gameName,
              tagLine: player.tagLine,
            },
            create: {
              puuid: player.normalizedPuuid,
              gameName: player.gameName,
              tagLine: player.tagLine,
            },
          })
        : await tx.player.create({
            data: {
              puuid: null,
              gameName: player.gameName,
              tagLine: player.tagLine,
            },
          });

      await tx.matchPlayer.create({
        data: {
          gameId,
          participantId: player.participantId,
          playerId: dbPlayer.playerId,
          teamId: player.teamId,
          championId: player.championId,
          firstBlood: player.firstBlood,
          firstTower: player.firstTower,
          totalCs: player.totalCs,
        },
      });
    }
  });
}

export {
  asMatchSnapshotPayload,
  parseMatchFields,
  parsePlayers,
  persistMatchSnapshot,
};
export type { MatchSnapshotPayload, ParsedMatch, ParsedPlayer };
