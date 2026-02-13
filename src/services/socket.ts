import { io, Socket } from 'socket.io-client';
import { GameRoom, RoomPlayer, GameTurn, Word } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export interface ServerToClientEvents {
  'room:updated': (room: GameRoom) => void;
  'player:joined': (player: RoomPlayer) => void;
  'player:left': (playerId: string) => void;
  'player:ready': (playerId: string, isReady: boolean) => void;
  'host:transferred': (data: {
    newHost: {
      userId: string;
      playerName: string;
      user: { id: string; name: string; avatar: string | null }
    };
    message: string
  }) => void;
  'room:closed': (data: { message: string; reason: string }) => void;
  'game:started': (data: { gameState: any }) => void;
  'game:turn-started': (turn: GameTurn, word: Word) => void;
  'game:turn-ended': (turn: GameTurn) => void;
  'game:word-guessed': (playerId: string, success: boolean, points: number) => void;
  'game:word-skipped': (playerId: string) => void;
  'game:finished': (room: GameRoom, winners: string[]) => void;
  // Quiz game events
  'question-show': (data: { question: any; timeLimit: number }) => void;
  'answer-submitted': (data: { playerId: string; answerId: number; isCorrect: boolean; timeElapsed: number }) => void;
  'round-result': (data: { correctAnswer: number; explanation: string; scores: { teamA: number; teamB: number } }) => void;
  'game-finished': (data: { finalScores: { teamA: number; teamB: number }; winner: string; stats: any }) => void;
  // Pantomima events
  'word-show': (data: { word: { id: string; word: string; category: string; difficulty: string }; timeLimit: number }) => void;
  'round-end': (data: { word: string; scores: { teamA: number; teamB: number } }) => void;
  'error': (data: { message: string; code: string }) => void;
}

export interface ClientToServerEvents {
  'room:join': (roomId: string, teamNumber?: number) => void;
  'room:leave': (roomId: string) => void;
  'player:set-ready': (roomId: string, isReady: boolean) => void;
  'game:start': (roomId: string) => void;
  'game:submit-guess': (roomId: string, success: boolean) => void;
  'game:skip-word': (roomId: string) => void;
  'game:end-turn': (roomId: string) => void;
  // Quiz game events
  'start-game': (data: { roomCode: string }) => void;
  'submit-answer': (data: { roomCode: string; answerId: number }) => void;
  'next-question': (data: { roomCode: string }) => void;
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private listeners: Map<keyof ServerToClientEvents, Function[]> = new Map();

  connect(): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.socket = io(WS_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        reject(error);
      });

      // Re-attach all listeners after connection
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          this.socket?.on(event, callback as any);
        });
      });

      // Timeout po 5 sekundách
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Socket connection timeout'));
        }
      }, 5000);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on<E extends keyof ServerToClientEvents>(
    event: E,
    callback: ServerToClientEvents[E]
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off<E extends keyof ServerToClientEvents>(
    event: E,
    callback: ServerToClientEvents[E]
  ): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ): void {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
