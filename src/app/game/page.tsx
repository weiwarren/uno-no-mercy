'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useGameState } from '@/hooks/useGameState';
import { GameBoard } from '@/components/game/GameBoard';
import { WaitingRoom } from '@/components/lobby/WaitingRoom';
import { GameOver } from '@/components/game/GameOver';
import { addPlayer } from '@/lib/game-logic';

function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: userLoading, isLoggedIn } = useUser();

  const mode = searchParams.get('mode') || 'single';
  const roomCode = searchParams.get('room') || undefined;

  const [initError, setInitError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isSinglePlayer = mode === 'single';
  const isHost = mode === 'host' || mode === 'single';

  // Show toast for 3 seconds then hide
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const {
    gameState,
    isLoading: gameLoading,
    currentPlayer,
    isMyTurn,
    myPlayer,
    playableCards,
    activePlayerId,
    handlePlayCard,
    handlePlayMultipleCards,
    handleDrawCard,
    handleCallUno,
    handleChallengeUno,
    handleStartGame,
    error: gameError,
  } = useGameState({
    playerId: user?.id || '',
    playerName: user?.username || 'Player',
    isHost,
    roomCode,
    isSinglePlayer,
    aiDifficulty: 'medium',
    onError: (msg) => {
      // Show game action errors as toast, not full page error
      if (gameState) {
        setToast(msg);
      } else {
        setInitError(msg);
      }
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !isLoggedIn) {
      router.push('/');
    }
  }, [userLoading, isLoggedIn, router]);

  const handleAddAI = useCallback(() => {
    // This would need to be implemented in the hook
    console.log('Add AI player');
  }, []);

  const handleLeave = useCallback(() => {
    router.push('/');
  }, [router]);

  const handlePlayAgain = useCallback(() => {
    // For single player, just refresh the page to start new game
    if (isSinglePlayer) {
      window.location.reload();
    } else {
      // For multiplayer, could implement rematch logic
      router.push('/');
    }
  }, [isSinglePlayer, router]);

  // Loading state
  if (userLoading || gameLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  // Error state (only for initialization errors)
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{initError}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // No game state yet
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Initializing game...</p>
      </div>
    );
  }

  // Waiting room for multiplayer
  if (gameState.status === 'waiting' && !isSinglePlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <WaitingRoom
          gameState={gameState}
          currentUserId={activePlayerId}
          onStartGame={handleStartGame}
          onAddAI={handleAddAI}
          onLeave={handleLeave}
        />
      </div>
    );
  }

  // Game over
  if (gameState.status === 'finished') {
    return (
      <div className="h-screen overflow-hidden">
        <GameBoard
          gameState={gameState}
          currentPlayerId={activePlayerId}
          playableCards={[]}
          isMyTurn={false}
          onPlayCard={() => {}}
          onDrawCard={() => {}}
          onCallUno={() => {}}
          onChallengeUno={() => {}}
        />
        <GameOver
          gameState={gameState}
          currentUserId={activePlayerId}
          onPlayAgain={handlePlayAgain}
          onBackToLobby={handleLeave}
        />
      </div>
    );
  }

  // Active game
  return (
    <div className="h-screen flex flex-col relative">
      <GameBoard
        gameState={gameState}
        currentPlayerId={activePlayerId}
        playableCards={playableCards}
        isMyTurn={isMyTurn}
        onPlayCard={handlePlayCard}
        onPlayMultipleCards={handlePlayMultipleCards}
        onDrawCard={handleDrawCard}
        onCallUno={handleCallUno}
        onChallengeUno={handleChallengeUno}
      />
      {/* Toast notification for game warnings */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}
