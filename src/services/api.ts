import axios, { AxiosInstance, AxiosError } from 'axios';
import { User, GameRoom, RoomPlayer, Word, ApiError, Game } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token from localStorage if it exists
    const token = localStorage.getItem('token');
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        const message = error.response?.data?.message || 'An error occurred';
        return Promise.reject({ message, statusCode: error.response?.status });
      }
    );
  }

  // Auth endpoints
  async googleLogin(credential: string): Promise<{ user: User; token: string }> {
    const response = await this.api.post<{ success: boolean; data: { user: User; token: string } }>(
      '/auth/google',
      { credential }
    );

    // Store token in localStorage
    if (response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      this.api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
    }

    return response.data.data;
  }

  async getMe(): Promise<User> {
    const response = await this.api.get<{ success: boolean; data: { user: User } }>('/auth/me');
    return response.data.data.user;
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout');
    localStorage.removeItem('token');
    delete this.api.defaults.headers.common['Authorization'];
  }

  async devLogin(name: string): Promise<{ user: User; token: string }> {
    const response = await this.api.post<{ success: boolean; data: { user: User; token: string } }>(
      '/auth/dev-login',
      { name }
    );

    // Store token in localStorage
    if (response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      this.api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
    }

    return response.data.data;
  }

  // Game endpoints
  async getGames(filters?: { type?: 'STATIC' | 'ONLINE' }): Promise<Game[]> {
    const response = await this.api.get<{ success: boolean; data: { games: Game[] } }>('/games', { params: filters });
    return response.data.data.games;
  }

  // Room endpoints
  async getRooms(): Promise<GameRoom[]> {
    const response = await this.api.get<{ success: boolean; data: { rooms: any[] } }>('/rooms');

    // Transform backend response to frontend GameRoom format
    return response.data.data.rooms.map(room => ({
      id: room.id,
      name: room.name,
      code: room.roomCode,
      gameType: room.gameType,
      status: room.status,
      maxPlayers: room.maxPlayers,
      currentPlayers: room.currentPlayers,
      createdBy: room.host?.id || '',
      createdAt: room.createdAt,
      startedAt: null,
      finishedAt: null,
    }));
  }

  async getRoom(roomCode: string): Promise<GameRoom> {
    const response = await this.api.get<{ success: boolean; data: { room: any } }>(`/rooms/${roomCode}`);
    const room = response.data.data.room;

    // Transform backend response to frontend GameRoom format
    return {
      id: room.id,
      name: room.game?.name || 'Unknown Game',
      code: room.roomCode,
      gameType: room.game?.slug?.toUpperCase() as any || 'ALIAS',
      status: room.status,
      maxPlayers: room.settings?.maxPlayers || room.game?.maxPlayers || 10,
      currentPlayers: room.players?.length || 0,
      createdBy: room.host?.id || '',
      createdAt: room.createdAt,
      startedAt: room.startedAt,
      finishedAt: room.finishedAt,
    };
  }

  async createRoom(data: {
    gameId: string;
    settings: {
      rounds: number;
      timePerQuestion?: number;
      categories?: string[];
      difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
      teamMode: boolean;
      maxPlayers?: number;
    };
    isPrivate?: boolean;
    password?: string;
    roomName?: string;
  }): Promise<GameRoom> {
    const response = await this.api.post<{ success: boolean; data: { room: any } }>('/rooms', data);
    const room = response.data.data.room;

    // Transform backend response to frontend GameRoom format
    return {
      id: room.id,
      name: room.game?.name || 'Unknown Game',
      code: room.roomCode, // Backend uses roomCode, frontend uses code
      gameType: room.game?.slug?.toUpperCase() as any || 'ALIAS',
      status: room.status,
      maxPlayers: room.settings?.maxPlayers || room.game?.maxPlayers || 10,
      currentPlayers: 0,
      createdBy: room.hostId || '',
      createdAt: room.createdAt,
      startedAt: null,
      finishedAt: null,
    };
  }

  async joinRoom(roomCode: string, playerName?: string, team: 'A' | 'B' | 'SPECTATOR' = 'SPECTATOR', password?: string): Promise<RoomPlayer> {
    const response = await this.api.post<{ success: boolean; data: { player: any } }>(
      `/rooms/${roomCode}/join`,
      {
        playerName: playerName || 'Anonymous Player',
        team,
        password,
      }
    );

    const player = response.data.data.player;

    // Transform backend response to frontend RoomPlayer format
    return {
      id: player.id,
      userId: player.user?.id || player.userId || '',
      roomId: player.roomId || '',
      teamNumber: player.team === 'A' ? 1 : player.team === 'B' ? 2 : 0,
      score: 0,
      isHost: false,
      isReady: player.isReady || false,
      isConnected: player.isConnected || true,
      joinedAt: player.joinedAt,
      user: player.user,
    };
  }

  async leaveRoom(roomId: string): Promise<void> {
    await this.api.post(`/rooms/${roomId}/leave`);
  }

  async setReady(roomCode: string, playerId: string, isReady: boolean): Promise<void> {
    console.log('API setReady called:', { roomCode, playerId, isReady });
    const response = await this.api.post(`/rooms/${roomCode}/players/${playerId}/ready`, { isReady });
    console.log('API setReady response:', response.data);
  }

  async startGame(roomId: string): Promise<void> {
    await this.api.post(`/rooms/${roomId}/start`);
  }

  async getRoomPlayers(roomCode: string): Promise<RoomPlayer[]> {
    const response = await this.api.get<{ success: boolean; data: { players: any[] } }>(`/rooms/${roomCode}/players`);

    // Transform backend response to frontend RoomPlayer format
    return response.data.data.players.map(player => ({
      id: player.id,
      userId: player.user?.id || player.userId || '',
      roomId: player.roomId || '',
      teamNumber: player.team === 'A' ? 1 : player.team === 'B' ? 2 : 0,
      score: player.score || 0,
      isHost: player.isHost || false,
      isReady: player.isReady || false,
      isConnected: player.isConnected || true,
      joinedAt: player.joinedAt,
      user: player.user,
    }));
  }

  // Game endpoints
  async getWord(roomId: string): Promise<Word> {
    const response = await this.api.get<Word>(`/game/${roomId}/word`);
    return response.data;
  }

  async submitGuess(roomId: string, success: boolean, currentPlayerId?: string): Promise<void> {
    await this.api.post(`/game/${roomId}/guess`, { success, currentPlayerId });
  }

  async skipWord(roomId: string): Promise<void> {
    await this.api.post(`/game/${roomId}/skip`);
  }

  async endTurn(roomId: string): Promise<void> {
    await this.api.post(`/game/${roomId}/end-turn`);
  }

  async getRoomMetadata(roomCode: string): Promise<{
    roomCode: string;
    roomName: string | null;
    isPrivate: boolean;
    requiresPassword: boolean;
    status: string;
    gameName: string;
  }> {
    const response = await this.api.get<{ success: boolean; data: { metadata: any } }>(`/rooms/${roomCode}/metadata`);
    return response.data.data.metadata;
  }
}

export const apiService = new ApiService();
