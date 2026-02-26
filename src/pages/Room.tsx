import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { GameRoom, RoomPlayer } from '../types';
import { Button, Card, Loading, PasswordDialog } from '../components/common';

export const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [verifiedPassword, setVerifiedPassword] = useState<string>();
  const [showQRCode, setShowQRCode] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const hasJoinedRef = React.useRef(false);

  const currentPlayer = players.find((p) => p.userId === user?.id);
  const isHost = currentPlayer?.isHost ?? false;
  const allPlayersReady = players.length >= 2 && players.every((p) => p.isReady || p.isHost);

  // Debug log
  React.useEffect(() => {
    console.log('Room state:', {
      roomId,
      user: user?.id,
      currentPlayer: currentPlayer?.id,
      players: players.map(p => ({ id: p.id, userId: p.userId, isReady: p.isReady })),
    });
  }, [roomId, user, currentPlayer, players]);

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    // Nejdříve nastavit listenery, pak připojit socket a načíst místnost
    setupSocketListeners();
    loadRoom();

    return () => {
      socketService.off('room:updated', handleRoomUpdated);
      socketService.off('player:joined', handlePlayerJoined);
      socketService.off('player:left', handlePlayerLeft);
      socketService.off('player:ready', handlePlayerReady);
      socketService.off('game:started', handleGameStarted);
      socketService.off('room:closed', handleRoomClosed);
      socketService.off('host:transferred', handleHostTransferred);
    };
  }, [roomId]);

  const handlePasswordSubmit = async (password: string) => {
    setVerifiedPassword(password);
    setShowPasswordDialog(false);
    // Trigger reload with verified password
    await loadRoom();
  };

  const handleCopyLink = async () => {
    if (!roomId) return;
    const url = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const loadRoom = async () => {
    if (!roomId) return;

    try {
      setIsLoading(true);

      // First connect socket and setup listeners
      try {
        await socketService.connect();
      } catch (socketErr) {
        console.error('Failed to connect socket:', socketErr);
        setError('Nepodařilo se připojit k serveru');
        return;
      }

      // Check if password is required
      try {
        const metadata = await apiService.getRoomMetadata(roomId);

        if (metadata.requiresPassword && !verifiedPassword) {
          setShowPasswordDialog(true);
          setIsLoading(false);
          return;
        }
      } catch (metadataErr) {
        console.error('Failed to get room metadata:', metadataErr);
      }

      const [roomData, playersData] = await Promise.all([
        apiService.getRoom(roomId),
        apiService.getRoomPlayers(roomId),
      ]);

      setRoom(roomData);
      setPlayers(playersData);

      // Check if current user is already a player in the room
      const isPlayerInRoom = user && playersData.some(p => p.userId === user.id);

      // If not, join the room (only once)
      if (user && !isPlayerInRoom && !hasJoinedRef.current) {
        hasJoinedRef.current = true;
        try {
          const newPlayer = await apiService.joinRoom(roomId, user.name || 'Anonymous', 'SPECTATOR', verifiedPassword);
          // Add the player immediately to local state (with deduplication check)
          setPlayers(prev => {
            // Check if player already exists (might have been added via socket event)
            if (prev.some(p => p.id === newPlayer.id || p.userId === newPlayer.userId)) {
              return prev;
            }
            return [...prev, newPlayer];
          });
        } catch (joinErr) {
          console.error('Failed to join room:', joinErr);
          hasJoinedRef.current = false; // Reset on error
        }
      }

      // Join room via socket after everything is ready
      socketService.emit('room:join', roomId);
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se načíst místnost');
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocketListeners = () => {
    socketService.on('room:updated', handleRoomUpdated);
    socketService.on('player:joined', handlePlayerJoined);
    socketService.on('player:left', handlePlayerLeft);
    socketService.on('player:ready', handlePlayerReady);
    socketService.on('game:started', handleGameStarted);
    socketService.on('room:closed', handleRoomClosed);
    socketService.on('host:transferred', handleHostTransferred);
  };

  const handleRoomUpdated = (updatedRoom: GameRoom) => {
    setRoom(updatedRoom);
  };

  const handlePlayerJoined = async (player: RoomPlayer | any) => {
    setPlayers((prev) => {
      // Check if player already exists
      if (prev.some(p => p.id === player.id || p.userId === (player.user?.id || player.userId))) {
        return prev;
      }
      // Transform socket event data to frontend format (backend sends team, frontend uses teamNumber)
      const transformedPlayer: RoomPlayer = {
        id: player.id,
        userId: player.user?.id || player.userId || '',
        roomId: player.roomId || '',
        teamNumber: player.teamNumber ?? (player.team === 'A' ? 1 : player.team === 'B' ? 2 : 0),
        score: player.score || 0,
        isHost: player.isHost || false,
        isReady: player.isReady || false,
        isConnected: player.isConnected ?? true,
        joinedAt: player.joinedAt,
        user: player.user,
      };
      return [...prev, transformedPlayer];
    });
  };

  const handlePlayerLeft = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  const handlePlayerReady = (playerId: string, isReady: boolean) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, isReady } : p))
    );
  };

  const handleGameStarted = (data: any) => {
    // Data mohou být buď GameRoom objekt (pro Word hry) nebo { gameState } (pro kvízové hry)
    if (data && typeof data === 'object') {
      if (data.gameState) {
        // Kvízová hra - přesměruj rovnou do hry
        console.log('Quiz game started with state:', data.gameState);
      } else {
        // Word hra - aktualizuj room
        setRoom(data);
      }
    }
    navigate(`/game/${roomId}`);
  };

  const handleRoomClosed = (data: { message: string; reason: string }) => {
    // Zobrazit uživateli zprávu a přesměrovat na home
    alert(data.message || 'Místnost byla ukončena');
    navigate('/');
  };

  const handleHostTransferred = (data: {
    newHost: {
      userId: string;
      playerName: string;
      user: { id: string; name: string; avatar: string | null }
    };
    message: string
  }) => {
    console.log('Host transferred:', data);

    // Zobrazit notifikaci
    setNotification(data.message);
    setTimeout(() => setNotification(null), 5000);

    // Aktualizovat seznam hráčů - označit nového hostitele
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        isHost: p.userId === data.newHost.userId,
      }))
    );

    // Pokud je aktuální uživatel nový hostitel, aktualizovat room
    if (user?.id === data.newHost.userId) {
      console.log('You are now the host!');
      // Znovu načíst místnost, aby se aktualizovala data
      loadRoom();
    }
  };

  const handleToggleReady = async () => {
    if (!roomId || !currentPlayer) {
      console.log('Cannot toggle ready:', { roomId, currentPlayer });
      return;
    }

    console.log('Toggling ready for player:', currentPlayer.id, 'isReady:', currentPlayer.isReady);

    try {
      await apiService.setReady(roomId, currentPlayer.id, !currentPlayer.isReady);

      // Manually update local state
      setPlayers(prev =>
        prev.map(p =>
          p.id === currentPlayer.id ? { ...p, isReady: !currentPlayer.isReady } : p
        )
      );

      console.log('Ready status toggled successfully');
    } catch (err: any) {
      console.error('Failed to toggle ready:', err);
      setError(err.message || 'Nepodařilo se změnit stav');
    }
  };

  const handleStartGame = async () => {
    if (!roomId) return;

    try {
      await apiService.startGame(roomId);
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se spustit hru');
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomId) return;

    try {
      await apiService.leaveRoom(roomId);
      navigate('/');
    } catch (err: any) {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <Loading text="Načítání místnosti..." />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Chyba
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || 'Místnost nenalezena'}
          </p>
          <Button onClick={() => navigate('/')}>Zpět na hlavní stránku</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="container mx-auto max-w-4xl">
        {notification && (
          <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-blue-800 hover:text-blue-900"
            >
              ✕
            </button>
          </div>
        )}
        <Card className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {(room as any).roomName || room.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Kód místnosti: <span className="font-mono font-bold">{room.code}</span>
              </p>
              {(room as any).isPrivate && (
                <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                  🔒 Soukromá
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleCopyLink}
                className="px-3 py-1 bg-green-100 text-green-800 hover:bg-green-200 rounded-lg text-sm transition-colors"
              >
                {copySuccess ? '✓ Zkopírováno' : '📋 Kopírovat odkaz'}
              </button>
              <button
                onClick={() => setShowQRCode(!showQRCode)}
                className="px-3 py-1 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-lg text-sm transition-colors"
              >
                📱 QR kód
              </button>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm text-center">
                {room.gameType}
              </span>
            </div>
          </div>

          {showQRCode && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex flex-col items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Naskenujte pro připojení</p>
                <QRCodeSVG
                  value={`${window.location.origin}/room/${room.code}`}
                  size={200}
                  level="H"
                  marginSize={4}
                />
              </div>
            </div>
          )}
        </Card>

        <PasswordDialog
          isOpen={showPasswordDialog}
          roomCode={roomId || ''}
          roomName={(room as any)?.roomName}
          onSubmit={handlePasswordSubmit}
          onCancel={() => navigate('/')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Hráči ({players.length}/{room.maxPlayers})
            </h2>
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {player.user?.picture && (
                      <img
                        src={player.user.picture}
                        alt={player.user.name || 'Player'}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {player.user?.name || 'Player'}
                        {player.isHost && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Hostitel
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {player.teamNumber === 1 ? 'Tým A' : player.teamNumber === 2 ? 'Tým B' : 'Divák'}
                      </p>
                    </div>
                  </div>
                  <div>
                    {player.isReady || player.isHost ? (
                      <span className="text-green-600 font-semibold">✓ Připraven</span>
                    ) : (
                      <span className="text-gray-400">Čeká...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Pravidla
            </h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>• Minimální počet hráčů: 2</p>
              <p>• Hráči jsou rozděleni do týmů</p>
              <p>• Každý tým se střídá v popisování/ukazování</p>
              <p>• Získávejte body za správné odpovědi</p>
              <p>• Tým s nejvíce body vyhrává!</p>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            {!isHost && (
              <Button
                onClick={handleToggleReady}
                variant={currentPlayer?.isReady ? 'secondary' : 'primary'}
                fullWidth
              >
                {currentPlayer?.isReady ? 'Zrušit připravenost' : 'Připraven'}
              </Button>
            )}
            {isHost && (
              <Button
                onClick={handleStartGame}
                disabled={!allPlayersReady}
                fullWidth
              >
                {allPlayersReady ? 'Spustit hru' : 'Čekání na hráče...'}
              </Button>
            )}
            <Button onClick={handleLeaveRoom} variant="outline" fullWidth>
              Opustit místnost
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
