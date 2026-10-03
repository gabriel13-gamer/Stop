export type RoomMode = "public" | "private" | "friends";
export type RoomStatus =
  | "lobby"
  | "playing"
  | "verifying"
  | "results"
  | "finished";
export type StopKind = "manual" | "auto";
export type AnswerStatus = "valid" | "duplicate" | "invalid" | "empty" | "vote";

export type CategoryDef = {
  id: string;
  label: string;
  custom?: boolean;
};

export type Profile = {
  userId: string;
  username: string;
  displayName: string;
  avatarId: string;
  isGuest: boolean;
  looking: boolean;
  lastSeen: string;
  wins: number;
  gamesPlayed: number;
  totalPoints: number;
  bestScore: number;
  stops: number;
  createdAt: string;
};

export type PlayerPublic = {
  userId: string;
  username: string;
  displayName: string;
  avatarId: string;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  score: number;
  stops: number;
  correct: number;
  invalid: number;
  bestRound: number;
  roundsWon: number;
};

export type VerdictItem = {
  userId: string;
  categoryId: string;
  answer: string;
  status: AnswerStatus;
  points: number;
  needsVote: boolean;
  acceptVotes: number;
  rejectVotes: number;
};

export type RoomConfig = {
  mode: RoomMode;
  maxPlayers: number;
  categories: CategoryDef[];
  letters: string[];
  roundSeconds: number;
  totalRounds: number;
  duplicatePoints: 0 | 5;
};

export type RoomState = {
  code: string;
  hostId: string;
  mode: RoomMode;
  maxPlayers: number;
  categories: CategoryDef[];
  letters: string[];
  usedLetters: string[];
  roundSeconds: number;
  totalRounds: number;
  duplicatePoints: 0 | 5;
  status: RoomStatus;
  currentRound: number;
  currentLetter: string | null;
  roundStartedAt: string | null;
  roundEndsAt: string | null;
  stopBy: string | null;
  stopKind: StopKind | null;
  serverNow: string;
  players: PlayerPublic[];
  myAnswers: Record<string, string>;
  verdicts: VerdictItem[];
  roundScores: Record<string, number>;
  incomingInvites: Invite[];
};

export type Invite = {
  id: string;
  roomCode: string;
  fromId: string;
  fromName: string;
  toId: string;
  status: string;
  createdAt: string;
};

export type HistorySummary = {
  id: string;
  roomCode: string;
  playedAt: string;
  winnerName: string | null;
  winnerId: string | null;
  totalRounds: number;
  myScore: number;
  players: { userId: string; name: string; score: number; avatarId: string }[];
};

export type RankRow = {
  userId: string;
  username: string;
  displayName: string;
  avatarId: string;
  wins: number;
  totalPoints: number;
  gamesPlayed: number;
  position: number;
};
