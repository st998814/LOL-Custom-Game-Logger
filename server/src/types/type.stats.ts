type StatsOpponent = {
  gameName: string | null;
  tagLine: string | null;
};

type StatsMatchLine = {
  gameId: number;
  gameCreationDate: string;
  gameDuration: number;
  won: boolean;
  opponent: StatsOpponent;
  myChampionId: number;
  opponentChampionId: number;
  firstBlood: boolean;
  firstTower: boolean;
  totalCs: number;
  winReason?: string;
};

type PlayerIdentity = {
  gameName: string | null;
  tagLine: string | null;
};

type AllTimeStats = PlayerIdentity & {
  wins: number;
  losses: number;
};

type AverageStats = PlayerIdentity & {
  winRate: number;
  avgDurationSec: number;
  avgFirstBloodRate: number;
  avgFirstTowerRate: number;
  avgCs: number;
};

type WinReasonKey = 'firstBlood' | 'firstTower' | 'cs';

type TopmostStats = PlayerIdentity & {
  mostSelectedChampionId: number | null;
  mostCommonWinReason: WinReasonKey | null;
};

type WinReasonCounts = {
  firstBlood: number;
  firstTower: number;
  cs: number;
};

type ChampionStats = PlayerIdentity & {
  championId: number;
  games: number;
  wins: number;
  losses: number;
  winReasons: WinReasonCounts;
};

type DateStats = PlayerIdentity & {
  date: string;
  games: number;
  wins: number;
  losses: number;
};

export type {
  StatsOpponent,
  StatsMatchLine,
  PlayerIdentity,
  AllTimeStats,
  AverageStats,
  WinReasonKey,
  TopmostStats,
  WinReasonCounts,
  ChampionStats,
  DateStats,
};
