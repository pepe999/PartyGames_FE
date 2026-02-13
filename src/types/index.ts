export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  provider: 'GOOGLE' | 'GITHUB';
  createdAt: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  type: 'STATIC' | 'ONLINE';
  description?: string;
  rules?: string;
  minPlayers: number;
  maxPlayers: number;
  imageUrl?: string;
}

export enum GameType {
  ALIAS = 'ALIAS',
  PANTOMIMA = 'PANTOMIMA',
  CHARADES = 'CHARADES'
}

export enum RoomStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED'
}

export interface GameRoom {
  id: string;
  name: string;
  code: string;
  gameType: GameType;
  status: RoomStatus;
  maxPlayers: number;
  currentPlayers: number;
  createdBy: string;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  players?: Array<{
    id: string;
    playerName: string;
    team: string;
    userId?: string;
  }>;
}

export interface RoomPlayer {
  id: string;
  userId: string;
  roomId: string;
  teamNumber: number;
  score: number;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  joinedAt: string;
  user?: User;
}

export enum TurnAction {
  GUESS = 'GUESS',
  SKIP = 'SKIP',
  EXPLAIN = 'EXPLAIN'
}

export interface GameTurn {
  id: string;
  roomId: string;
  playerId: string;
  roundNumber: number;
  wordId: string | null;
  action: TurnAction;
  points: number;
  startedAt: string;
  endedAt?: string | null;
  player?: RoomPlayer;
}

export interface Word {
  id: string;
  gameType: GameType;
  word: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category?: string | null;
  language: string;
}

export interface Team {
  number: number;
  name: string;
  players: RoomPlayer[];
  score: number;
  color: string;
}

export interface GameState {
  room: GameRoom;
  players: RoomPlayer[];
  teams: Team[];
  currentTurn?: GameTurn;
  currentWord?: Word;
  roundNumber: number;
  timeLeft: number;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
