import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';
import { GameRoom, Word, GameTurn, RoomPlayer } from '../types';
import { Button, Card, Loading } from '../components/common';
import { apiService } from '../services/api';

// Quiz game types
interface QuizQuestion {
  id: string;
  content: {
    question: string;
    answers: string[];
    correctAnswer?: number;
    explanation?: string;
  };
}

interface QuizScores {
  teamA: number;
  teamB: number;
}

export const Game: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);

  // Word game state
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [currentTurn, setCurrentTurn] = useState<GameTurn | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [score, setScore] = useState<{ [teamNumber: number]: number }>({});

  // Quiz game state
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [quizScores, setQuizScores] = useState<QuizScores>({ teamA: 0, teamB: 0 });
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);

  // Pantomima state
  const [pantomimaWord, setPantomimaWord] = useState<{ word: string; category: string; difficulty: string } | null>(null);

  const currentPlayer = players.find((p) => p.userId === user?.id);
  const isMyTurn = currentTurn?.playerId === currentPlayer?.id;

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    loadGameData();
    setupSocketListeners();

    return () => {
      // Word game events
      socketService.off('game:turn-started', handleTurnStarted);
      socketService.off('game:turn-ended', handleTurnEnded);
      socketService.off('game:word-guessed', handleWordGuessed);
      socketService.off('game:word-skipped', handleWordSkipped);
      socketService.off('game:finished', handleGameFinished);
      socketService.off('room:closed', handleRoomClosed);

      // Quiz game events
      socketService.off('question-show', handleQuestionShow);
      socketService.off('round-result', handleRoundResult);
      socketService.off('answer-submitted', handleAnswerSubmitted);

      // Pantomima events
      socketService.off('word-show', handleWordShow);
      socketService.off('round-end', handleRoundEnd);
    };
  }, [roomId]);

  useEffect(() => {
    if (currentTurn && !currentTurn.endedAt) {
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
  }, [currentTurn]);

  const loadGameData = async () => {
    if (!roomId) return;

    try {
      // Ensure socket is connected
      try {
        await socketService.connect();
      } catch (socketErr) {
        console.error('Failed to connect socket:', socketErr);
      }

      const [roomData, playersData] = await Promise.all([
        apiService.getRoom(roomId),
        apiService.getRoomPlayers(roomId),
      ]);

      setRoom(roomData);
      setPlayers(playersData);

      // Join room via socket (use roomCode, not roomId)
      socketService.emit('room:join', roomData.code);

      // Request current game state (in case we missed the initial word-show event)
      // Wait longer to ensure backend has set the current word
      setTimeout(() => {
        console.log('>>> Requesting game state for room:', roomData.code);
        socketService.emit('game:get-state', roomData.code);
      }, 2500);

      // Calculate team scores
      const teamScores: { [key: number]: number } = {};
      playersData.forEach((p) => {
        if (!teamScores[p.teamNumber]) {
          teamScores[p.teamNumber] = 0;
        }
        teamScores[p.teamNumber] += p.score;
      });
      setScore(teamScores);
    } catch (error) {
      console.error('Failed to load game data:', error);
    }
  };

  const setupSocketListeners = () => {
    console.log('Setting up socket listeners for Game component');

    // Word game events
    socketService.on('game:turn-started', handleTurnStarted);
    socketService.on('game:turn-ended', handleTurnEnded);
    socketService.on('game:word-guessed', handleWordGuessed);
    socketService.on('game:word-skipped', handleWordSkipped);
    socketService.on('game:finished', handleGameFinished);
    socketService.on('room:closed', handleRoomClosed);

    // Quiz game events
    socketService.on('question-show', handleQuestionShow);
    socketService.on('round-result', handleRoundResult);
    socketService.on('answer-submitted', handleAnswerSubmitted);

    // Pantomima events
    socketService.on('word-show', (data) => {
      console.log('>>> WORD-SHOW EVENT RECEIVED:', data);
      handleWordShow(data);
    });
    socketService.on('round-end', handleRoundEnd);
  };

  const handleTurnStarted = (turn: GameTurn, word: Word) => {
    setCurrentTurn(turn);
    setCurrentWord(word);
    setTimeLeft(60);
  };

  const handleTurnEnded = () => {
    setCurrentTurn(null);
    setCurrentWord(null);
    setTimeLeft(0);
  };

  const handleWordGuessed = (data: any) => {
    // Backend posílá objekt s playerId, userId, teamNumber, success, points, newScore
    const playerId = data.playerId || data;
    const success = typeof data === 'object' ? data.success : false;
    const points = typeof data === 'object' ? data.points : 0;
    const newScore = typeof data === 'object' ? data.newScore : undefined;

    // Najít hráče podle playerId nebo userId
    const player = players.find((p) => p.id === playerId || (data.userId && p.userId === data.userId));
    if (!player) {
      console.warn('Player not found for guess:', data);
      return;
    }

    // Aktualizuj skóre pro tým, který odpovídal
    if (success && points > 0) {
      setScore((prev) => ({
        ...prev,
        [player.teamNumber]: (prev[player.teamNumber] || 0) + points,
      }));

      // Aktualizuj skóre hráče v seznamu hráčů
      // Použij newScore z backendu pokud je k dispozici, jinak přičti points
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, score: newScore !== undefined ? newScore : p.score + points } : p
        )
      );
    }

    // Pokud byla odpověď špatná, přepni na další tým (automaticky ukončí tah)
    if (!success) {
      // Zavolaj endTurn, které přepne na další tým
      setTimeout(() => {
        if (roomId) {
          handleEndTurn();
        }
      }, 500);
    }
  };

  const handleWordSkipped = (_playerId: string) => {
    // Word was skipped
  };

  const handleGameFinished = (finishedRoom: GameRoom) => {
    setRoom(finishedRoom);
    // Show winners dialog or navigate to results
  };

  const handleRoomClosed = (data: { message: string; reason: string }) => {
    // Zobrazit uživateli zprávu a přesměrovat na home
    alert(data.message || 'Místnost byla ukončena');
    navigate('/');
  };

  // Quiz game handlers
  const handleQuestionShow = (data: { question: QuizQuestion; timeLimit: number }) => {
    console.log('Question received:', data);
    setCurrentQuestion(data.question);
    setTimeLeft(data.timeLimit);
    setSelectedAnswer(null);
    setShowResult(false);
    setCorrectAnswer(null);
  };

  // Pantomima handlers
  const handleWordShow = (data: { word: { id: string; word: string; category: string; difficulty: string }; timeLimit: number }) => {
    console.log('Pantomima word received:', data);
    setPantomimaWord(data.word);
    setTimeLeft(data.timeLimit);
    setShowResult(false);
  };

  const handleRoundEnd = (data: { word: string; scores: QuizScores }) => {
    console.log('Pantomima round ended:', data);
    setQuizScores(data.scores);
    setShowResult(true);
    // Vyčistit slovo po 3 sekundách
    setTimeout(() => {
      setPantomimaWord(null);
      setShowResult(false);
    }, 3000);
  };

  const handleRoundResult = (data: { correctAnswer: number; explanation: string; scores: QuizScores }) => {
    console.log('Round result:', data);
    setCorrectAnswer(data.correctAnswer);
    setShowResult(true);
    setQuizScores(data.scores);

    // Po 5 sekundách vyčistit stav a čekat na další otázku
    setTimeout(() => {
      setShowResult(false);
      setCurrentQuestion(null);
      setSelectedAnswer(null);
      setCorrectAnswer(null);
    }, 5000);
  };

  const handleAnswerSubmitted = (data: { playerId: string; answerId: number; isCorrect: boolean; timeElapsed: number }) => {
    console.log('Answer submitted:', data);
    // Můžeme zobrazit notifikaci, že někdo odpověděl
  };

  const handleGuess = async (success: boolean) => {
    if (!roomId || !currentTurn) return;

    try {
      await apiService.submitGuess(roomId, success, currentTurn.playerId);
      if (success) {
        // Get next word
        const nextWord = await apiService.getWord(roomId);
        setCurrentWord(nextWord);
      }
      // Pokud je odpověď špatná, handleWordGuessed automaticky zavolá endTurn
    } catch (error) {
      console.error('Failed to submit guess:', error);
    }
  };

  const handleSkip = async () => {
    if (!roomId) return;

    try {
      await apiService.skipWord(roomId);
      const nextWord = await apiService.getWord(roomId);
      setCurrentWord(nextWord);
    } catch (error) {
      console.error('Failed to skip word:', error);
    }
  };

  const handleEndTurn = async () => {
    if (!roomId) return;

    try {
      await apiService.endTurn(roomId);
    } catch (error) {
      console.error('Failed to end turn:', error);
    }
  };

  // Quiz game actions
  const handleSubmitAnswer = (answerId: number) => {
    if (!roomId || selectedAnswer !== null) return;

    setSelectedAnswer(answerId);
    socketService.emit('submit-answer', { roomCode: roomId, answerId });
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <Loading text="Načítání hry..." />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Show quiz scores if it's a quiz game, otherwise show word game scores */}
          {currentQuestion || quizScores.teamA > 0 || quizScores.teamB > 0 ? (
            <>
              <Card className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tým A
                </h3>
                <p className="text-3xl font-bold text-primary-600">{quizScores.teamA}</p>
              </Card>
              <Card className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tým B
                </h3>
                <p className="text-3xl font-bold text-primary-600">{quizScores.teamB}</p>
              </Card>
            </>
          ) : (
            Object.entries(score).map(([teamNum, teamScore]) => (
              <Card key={teamNum} className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tým {teamNum}
                </h3>
                <p className="text-3xl font-bold text-primary-600">{teamScore}</p>
              </Card>
            ))
          )}
        </div>

        <Card className="mb-6">
          <div className="text-center mb-4">
            <div className="text-6xl font-bold text-primary-600 mb-2">{timeLeft}</div>
            <p className="text-gray-600 dark:text-gray-400">sekund zbývá</p>
          </div>

          {/* Pantomima UI */}
          {pantomimaWord ? (
            <div className="text-center">
              <div className="mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-12 mb-6 shadow-lg">
                  <p className="text-5xl font-bold text-white mb-4">
                    {pantomimaWord.word}
                  </p>
                  <div className="flex justify-center gap-4 text-white">
                    <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-semibold">
                      📁 {pantomimaWord.category}
                    </span>
                    <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-semibold">
                      ⭐ {pantomimaWord.difficulty}
                    </span>
                  </div>
                </div>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                  🎭 Předveďte toto slovo pantomimou!
                </p>
                {showResult && (
                  <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                    <p className="text-green-900 dark:text-green-100 font-semibold">
                      Kolo ukončeno! Přechod na další slovo...
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : currentQuestion ? (
            /* Quiz Game UI */
            <div className="text-center">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  {currentQuestion.content.question}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.content.answers.map((answer, index) => (
                    <button
                      key={index}
                      onClick={() => handleSubmitAnswer(index)}
                      disabled={selectedAnswer !== null || showResult}
                      className={`p-4 rounded-lg text-lg font-medium transition-all ${
                        showResult && correctAnswer === index
                          ? 'bg-green-500 text-white'
                          : showResult && selectedAnswer === index && correctAnswer !== index
                          ? 'bg-red-500 text-white'
                          : selectedAnswer === index
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                      } disabled:cursor-not-allowed`}
                    >
                      {answer}
                    </button>
                  ))}
                </div>

                {showResult && currentQuestion.content.explanation && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <p className="text-gray-900 dark:text-white font-semibold">
                      Vysvětlení:
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                      {currentQuestion.content.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : isMyTurn && currentWord ? (
            /* Word Game UI - Active Player */
            <div className="text-center">
              <div className="bg-primary-100 dark:bg-primary-900 rounded-lg p-8 mb-6">
                <p className="text-4xl font-bold text-gray-900 dark:text-white">
                  {currentWord.word}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {currentWord.category}
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button onClick={() => handleGuess(true)} size="lg">
                  Správně ✓
                </Button>
                <Button onClick={handleSkip} variant="secondary" size="lg">
                  Přeskočit
                </Button>
                <Button onClick={() => handleGuess(false)} variant="danger" size="lg">
                  Špatně ✗
                </Button>
              </div>

              <div className="mt-4">
                <Button onClick={handleEndTurn} variant="outline">
                  Ukončit tah
                </Button>
              </div>
            </div>
          ) : currentTurn ? (
            /* Word Game UI - Waiting */
            <div className="text-center">
              <p className="text-xl text-gray-900 dark:text-white mb-2">
                Hraje:{' '}
                {players.find((p) => p.id === currentTurn.playerId)?.user?.name ||
                  'Hráč'}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Hádejte, co ukazuje!
              </p>
            </div>
          ) : (
            /* Waiting for game to start */
            <div className="text-center">
              <p className="text-xl text-gray-900 dark:text-white">
                Čekání na další tah...
              </p>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Hráči
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {players.map((player) => (
              <div
                key={player.id}
                className={`p-3 rounded-lg ${
                  currentTurn?.playerId === player.id
                    ? 'bg-primary-100 dark:bg-primary-900 border-2 border-primary-500'
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <p className="font-medium text-gray-900 dark:text-white">
                  {player.user?.name || 'Player'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tým {player.teamNumber} • {player.score} bodů
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
