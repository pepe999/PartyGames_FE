import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { GameRoom, GameType } from '../types';
import { Button, Card, Loading } from '../components/common';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const Home: React.FC = () => {
  const { isAuthenticated, login, user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadRooms();
    }
  }, [isAuthenticated]);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getRooms();
      setRooms(data.filter(r => r.status === 'WAITING'));
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGameTypeDisplay = (type: GameType): string => {
    const names = {
      ALIAS: 'Alias',
      PANTOMIMA: 'Pantomima',
      CHARADES: 'Charades',
    };
    return names[type] || type;
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      await login(credentialResponse.credential);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleDevLogin = async (name: string) => {
    try {
      const response = await apiService.devLogin(name);
      localStorage.setItem('token', response.token);
      window.location.reload();
    } catch (error) {
      console.error('Dev login failed:', error);
    }
  };

  if (!isAuthenticated) {
    const isDev = import.meta.env.MODE === 'development';

    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
              Společenské hry online
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Hrajte Alias, Pantomimu a Charades se svými přáteli online!
            </p>
            <div className="flex justify-center mb-4">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => console.error('Login Failed')}
                useOneTap
                theme="filled_blue"
                size="large"
                text="signin_with"
                shape="rectangular"
              />
            </div>

            {isDev && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  DEV: Rychlé přihlášení pro testování
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDevLogin('Hráč 1')}
                    variant="secondary"
                    fullWidth
                    size="sm"
                  >
                    Hráč 1
                  </Button>
                  <Button
                    onClick={() => handleDevLogin('Hráč 2')}
                    variant="secondary"
                    fullWidth
                    size="sm"
                  >
                    Hráč 2
                  </Button>
                  <Button
                    onClick={() => handleDevLogin('Hráč 3')}
                    variant="secondary"
                    fullWidth
                    size="sm"
                  >
                    Hráč 3
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </GoogleOAuthProvider>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dostupné místnosti
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Vyberte si hru nebo vytvořte novou místnost
            </p>
          </div>
          <Button onClick={() => navigate('/create-room')}>
            Vytvořit místnost
          </Button>
        </div>

        {isLoading ? (
          <Loading text="Načítání místností..." />
        ) : rooms.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Žádné dostupné místnosti
            </p>
            <Button onClick={() => navigate('/create-room')}>
              Vytvořit první místnost
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const isOwnRoom = room.createdBy === user?.id;
              const isFull = room.currentPlayers >= room.maxPlayers;
              const isPlayerInRoom = room.players?.some(p => p.userId === user?.id);
              const canJoin = isOwnRoom || isPlayerInRoom || !isFull;

              return (
                <Card key={room.id} className="hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {room.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getGameTypeDisplay(room.gameType)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {room.currentPlayers}/{room.maxPlayers}
                    </span>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Kód místnosti: <span className="font-mono font-bold">{room.code}</span>
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate(`/room/${room.code}`)}
                    fullWidth
                    disabled={!canJoin}
                  >
                    {isOwnRoom ? 'Otevřít' : isPlayerInRoom ? 'Pokračovat' : isFull ? 'Plná' : 'Připojit se'}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
