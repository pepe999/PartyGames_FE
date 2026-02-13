import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';
import { GameRoom, RoomPlayer } from '../types';
import { Button, Card, Loading } from '../components/common';
import { apiService } from '../services/api';

interface QuizQuestion {
  id: string;
  content: {
    question: string;
    answers: string[];
    correctAnswer?: number;
    explanation?: string;
  };
}

interface QuizGameState {
  currentRound: number;
  scores: {
    teamA: number;
    teamB: number;
  };
}

export const QuizGame: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [gameState, setGameState] = useState<QuizGameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [winner, setWinner] = useState<string>('');

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    loadGameData();
    setupSocketListeners();

    return () => {
      socketService.off('game-started', handleGameStarted);
      socketService.off('question-show', handleQuestionShow);
      socketService.off('answer-submitted', handleAnswerSubmitted);
      socketService.off('round-result', handleRoundResult);
      socketService.off('game-finished', handleGameFinished);
      socketService.off('room:closed', handleRoomClosed);
    };
  }, [roomId]);

  useEffect(() => {
    if (currentQuestion && !showResult) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentQuestion, showResult]);

  const loadGameData = async () => {
    if (!roomId) return;

    try {
      const [roomData, playersData] = await Promise.all([
        apiService.getRoom(roomId),
        apiService.getRoomPlayers(roomId),
      ]);

      setRoom(roomData);
      setPlayers(playersData);

      // Připojit se do Socket.IO roomu pro real-time události
      await socketService.connect();
      socketService.emit('room:join', roomData.roomCode);
    } catch (error) {
      console.error('Failed to load game data:', error);
    }
  };

  const setupSocketListeners = () => {
    socketService.on('game-started', handleGameStarted);
    socketService.on('question-show', handleQuestionShow);
    socketService.on('answer-submitted', handleAnswerSubmitted);
    socketService.on('round-result', handleRoundResult);
    socketService.on('game-finished', handleGameFinished);
    socketService.on('room:closed', handleRoomClosed);
  };

  const handleGameStarted = (data: { gameState: QuizGameState }) => {
    console.log('[QuizGame] Game started event received:', data);
    setGameState(data.gameState);
  };

  const handleQuestionShow = (data: { question: QuizQuestion; timeLimit: number }) => {
    console.log('[QuizGame] Question show event received:', data);
    console.log('[QuizGame] Question content:', data.question?.content);
    setCurrentQuestion(data.question);
    setTimeLeft(data.timeLimit);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setShowResult(false);
  };

  const handleAnswerSubmitted = (data: {
    playerId: string;
    answerId: number;
    isCorrect: boolean;
    timeElapsed: number;
  }) => {
    console.log('Answer submitted:', data);
    // Můžete zobrazit notifikaci, že někdo odpověděl
  };

  const handleRoundResult = (data: {
    correctAnswer: number;
    explanation: string;
    scores: { teamA: number; teamB: number };
  }) => {
    console.log('Round result:', data);
    setCorrectAnswer(data.correctAnswer);
    setExplanation(data.explanation);
    setShowResult(true);
    setGameState((prev) => (prev ? { ...prev, scores: data.scores } : null));

    // Po 5 sekundách vymazat otázku a čekat na další
    setTimeout(() => {
      setCurrentQuestion(null);
      setShowResult(false);
      setCorrectAnswer(null);
      setExplanation('');
    }, 5000);
  };

  const handleGameFinished = (data: {
    finalScores: { teamA: number; teamB: number };
    winner: string;
    stats: any;
  }) => {
    console.log('Game finished:', data);
    setIsGameFinished(true);
    setWinner(data.winner);
    setGameState((prev) => (prev ? { ...prev, scores: data.finalScores } : null));
  };

  const handleRoomClosed = (data: { message: string; reason: string }) => {
    alert(data.message || 'Místnost byla ukončena');
    navigate('/');
  };

  const handleSubmitAnswer = (answerId: number) => {
    if (!room || hasAnswered || showResult) return;

    setSelectedAnswer(answerId);
    setHasAnswered(true);

    socketService.emit('submit-answer', {
      roomCode: room.code,
      answerId,
    });
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <Loading text="Načítání hry..." />
      </div>
    );
  }

  if (isGameFinished) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              Hra skončila!
            </h2>
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Výsledky:
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="text-center">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Tým A</h4>
                  <p className="text-4xl font-bold text-primary-600">{gameState?.scores.teamA || 0}</p>
                </Card>
                <Card className="text-center">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Tým B</h4>
                  <p className="text-4xl font-bold text-primary-600">{gameState?.scores.teamB || 0}</p>
                </Card>
              </div>
              <h3 className="text-2xl font-bold text-primary-600 mb-4">
                {winner === 'teamA' && 'Vítězí Tým A!'}
                {winner === 'teamB' && 'Vítězí Tým B!'}
                {winner === 'draw' && 'Remíza!'}
              </h3>
            </div>
            <Button onClick={() => navigate('/')}>Zpět na hlavní stránku</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {room.name}
          </h2>
          <Button onClick={() => navigate('/')} variant="outline" size="sm">
            ← Hlavní nabídka
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tým A</h3>
            <p className="text-3xl font-bold text-primary-600">{gameState?.scores.teamA || 0}</p>
          </Card>
          <Card className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tým B</h3>
            <p className="text-3xl font-bold text-primary-600">{gameState?.scores.teamB || 0}</p>
          </Card>
        </div>

        <Card className="mb-6">
          <div className="text-center mb-4">
            <div className="text-6xl font-bold text-primary-600 mb-2">{timeLeft}</div>
            <p className="text-gray-600 dark:text-gray-400">sekund zbývá</p>
          </div>

          {currentQuestion ? (
            <div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
                  {currentQuestion.content.question}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-6">
                {currentQuestion.content.answers.map((answer, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = correctAnswer === index;
                  const isWrong = showResult && isSelected && !isCorrect;

                  return (
                    <button
                      key={index}
                      onClick={() => handleSubmitAnswer(index)}
                      disabled={hasAnswered || showResult}
                      className={`p-4 rounded-lg text-left text-lg font-medium transition-all ${
                        showResult && isCorrect
                          ? 'bg-green-500 text-white'
                          : isWrong
                          ? 'bg-red-500 text-white'
                          : isSelected
                          ? 'bg-primary-500 text-white'
                          : hasAnswered || showResult
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-primary-100 dark:hover:bg-primary-900'
                      }`}
                    >
                      {answer}
                    </button>
                  );
                })}
              </div>

              {showResult && explanation && (
                <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-semibold">Vysvětlení:</span> {explanation}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xl text-gray-900 dark:text-white">
                Čekání na další otázku...
              </p>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hráči</h3>
          <div className="grid grid-cols-2 gap-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
              >
                <p className="font-medium text-gray-900 dark:text-white">
                  {player.user?.name || 'Player'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tým {player.teamNumber === 1 ? 'A' : 'B'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
