export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token?: string;
}

export interface Stats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  guessDistribution: Record<number, number>;
}

export interface RaceStats {
  totalRaces: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface RaceMatch {
  roomId: string;
  playerStatus: string;
  guessCount: number;
  roomStatus: string;
  createdAt: string;
  finishedAt: string | null;
}
