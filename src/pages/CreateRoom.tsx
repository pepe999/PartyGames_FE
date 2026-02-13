import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Game } from '../types';
import { Button, Card } from '../components/common';

export const CreateRoom: React.FC = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [formData, setFormData] = useState({
    gameId: '',
    rounds: 5,
    maxPlayers: 6,
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
    teamMode: true,
    isPrivate: true,
    password: '',
    roomName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadGames = async () => {
      try {
        const onlineGames = await apiService.getGames({ type: 'ONLINE' });
        setGames(onlineGames);
        if (onlineGames.length > 0) {
          setFormData(prev => ({ ...prev, gameId: onlineGames[0].id }));
        }
      } catch (err) {
        console.error('Failed to load games:', err);
      }
    };
    loadGames();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.gameId) {
      setError('Vyberte hru');
      return;
    }

    try {
      setIsLoading(true);
      const room = await apiService.createRoom({
        gameId: formData.gameId,
        settings: {
          rounds: formData.rounds,
          difficulty: formData.difficulty,
          teamMode: formData.teamMode,
          maxPlayers: formData.maxPlayers,
        },
        isPrivate: formData.isPrivate,
        password: formData.password.trim() || undefined,
        roomName: formData.roomName.trim() || undefined,
      });
      navigate(`/room/${room.code}`);
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se vytvořit místnost');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Vytvořit místnost
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Nastavte parametry nové herní místnosti
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vyberte hru
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              value={formData.gameId}
              onChange={(e) =>
                setFormData({ ...formData, gameId: e.target.value })
              }
              required
            >
              {games.length === 0 && <option value="">Načítání...</option>}
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Počet kol: {formData.rounds}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={formData.rounds}
              onChange={(e) =>
                setFormData({ ...formData, rounds: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Obtížnost
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              value={formData.difficulty}
              onChange={(e) =>
                setFormData({ ...formData, difficulty: e.target.value as 'EASY' | 'MEDIUM' | 'HARD' })
              }
            >
              <option value="EASY">Lehká</option>
              <option value="MEDIUM">Střední</option>
              <option value="HARD">Těžká</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Maximální počet hráčů: {formData.maxPlayers}
            </label>
            <input
              type="range"
              min="2"
              max="20"
              step="2"
              value={formData.maxPlayers}
              onChange={(e) =>
                setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Název místnosti (volitelné)
            </label>
            <input
              type="text"
              placeholder="např. Rodinný večer"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              value={formData.roomName}
              onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Soukromá místnost
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Skrytá v seznamu, přístupná pouze přes kód
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.isPrivate}
              onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
              className="w-5 h-5"
            />
          </div>

          {formData.isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Heslo (volitelné)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Zadejte heslo pro ochranu místnosti"
                  className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  maxLength={50}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.password ? `Heslo nastaveno (${formData.password.length} znaků)` : 'Bez hesla'}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              fullWidth
            >
              Zrušit
            </Button>
            <Button type="submit" fullWidth disabled={isLoading}>
              {isLoading ? 'Vytváření...' : 'Vytvořit'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
