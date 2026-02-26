import type { APIRequestContext } from '@playwright/test';

const API_URL = 'http://localhost:3000/api';

export interface Game {
  id: string;
  name: string;
  slug: string;
}

export interface DevLoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export async function devLogin(
  request: APIRequestContext,
  name: string
): Promise<DevLoginResult> {
  const response = await request.post(`${API_URL}/auth/dev-login`, {
    data: { name },
  });
  const data = await response.json();
  return {
    token: data.data.token,
    user: data.data.user,
  };
}

export async function getGames(request: APIRequestContext): Promise<Game[]> {
  const response = await request.get(`${API_URL}/games`);
  const data = await response.json();
  return data.data.games;
}

export async function getPantomimaGameId(request: APIRequestContext): Promise<string> {
  const games = await getGames(request);
  const pantomima = games.find((g) => g.slug === 'pantomima');
  if (!pantomima) {
    throw new Error('Pantomima game not found in database. Please run: npm run prisma:seed');
  }
  return pantomima.id;
}

export async function createRoom(
  request: APIRequestContext,
  gameId: string,
  settings: object = {},
  authToken?: string
): Promise<{ roomCode: string; id: string }> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await request.post(`${API_URL}/rooms`, {
    headers,
    data: {
      gameId,
      settings: {
        rounds: 3,
        timePerQuestion: 60,
        teamMode: true,
        maxPlayers: 10,
        ...settings,
      },
      isPrivate: false,
    },
  });

  const data = await response.json();
  return {
    roomCode: data.data.room.roomCode,
    id: data.data.room.id,
  };
}

export async function joinRoom(
  request: APIRequestContext,
  roomCode: string,
  playerName: string,
  team: 'A' | 'B' = 'A'
): Promise<{ playerId: string }> {
  const response = await request.post(`${API_URL}/rooms/${roomCode}/join`, {
    data: { playerName, team },
  });

  const data = await response.json();
  return { playerId: data.data.player.id };
}

export async function startGame(request: APIRequestContext, roomCode: string): Promise<void> {
  await request.post(`${API_URL}/rooms/${roomCode}/start`);
}
