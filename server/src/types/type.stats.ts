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
  puuid: string;
  gameName: string | null;
  tagLine: string | null;
  wins: number;
  losses: number;
};

type RecentStats = {
  puuid: string;
  gameName: string | null;
  tagLine: string | null;
  matches: StatsMatchLine[];
};

type OpponentRecord = {
  opponent: StatsOpponent;
  wins: number;
  losses: number;
};

type DetailedStats = {
  puuid: string;
  gameName: string | null;
  tagLine: string | null;
  byOpponent: OpponentRecord[];
  matches: StatsMatchLine[];
};

export type {
  StatsOpponent,
  StatsMatchLine,
  AllTimeStats,
  RecentStats,
  OpponentRecord,
  DetailedStats,
};
