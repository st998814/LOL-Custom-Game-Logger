type AccountStatus = {
  registered: boolean; // a players row exists for the PUUID
  linked: boolean; // that row has a tg_id
};

type LinkTicket = {
  status: 'pending';
  link: string;
  expiresIn: number; // seconds until the link expires
};

type LinkCompleted = {
  puuid: string;
  tgId: number;
  gameName: string | null;
};

export type { AccountStatus, LinkTicket, LinkCompleted };
