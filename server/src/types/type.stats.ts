type StatsOpponent = {
  gameName: string | null;
  tagLine: string | null;
};

type StatsMatchLine = {
  gameId: number;
  gameCreationDate: string;
  won: boolean;
  opponent: StatsOpponent;
  myChampionId: number;
  opponentChampionId: number;
  winReason?: string;
};

type AllTimeStats = {
  gameName: string | null;
  tagLine: string | null;
  wins: number;
  losses: number;
};

export type { StatsOpponent, StatsMatchLine, AllTimeStats };
