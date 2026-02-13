import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Loading } from '../components/common';
import { Game } from './Game';
import { QuizGame } from './QuizGame';

export const GameRouter: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [gameType, setGameType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRoomType = async () => {
      if (!roomId) {
        navigate('/');
        return;
      }

      try {
        const room = await apiService.getRoom(roomId);
        // Zjistit typ hry z místnosti nebo z Game objektu
        // Pokud je to kvízová hra (např. "Máme rádi Česko"), použít QuizGame
        // Jinak použít Game (pro Word hry)

        // Prozatím zkontrolujeme podle názvu nebo kódu
        // V budoucnu můžeme přidat do API informaci o typu obsahu (QUESTION vs WORD)
        if (room.name?.includes('Česko') || room.name?.toLowerCase().includes('kvíz')) {
          setGameType('quiz');
        } else {
          setGameType('word');
        }
      } catch (error) {
        console.error('Failed to load room:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadRoomType();
  }, [roomId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <Loading text="Načítání hry..." />
      </div>
    );
  }

  if (gameType === 'quiz') {
    return <QuizGame />;
  }

  return <Game />;
};
