'use client';

import { GameState } from '@/types/game';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface WaitingRoomProps {
  gameState: GameState;
  currentUserId: string;
  onStartGame: () => void;
  onAddAI: () => void;
  onLeave: () => void;
}

export function WaitingRoom({
  gameState,
  currentUserId,
  onStartGame,
  onAddAI,
  onLeave,
}: WaitingRoomProps) {
  const isHost = gameState.hostId === currentUserId;
  const canStart = gameState.players.length >= 2;
  const canAddAI = gameState.players.length < gameState.maxPlayers;

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Room Code */}
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">Share this code with friends:</p>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-4xl font-mono font-bold text-white tracking-[0.5em]">
            {gameState.roomCode}
          </p>
        </div>
      </div>

      {/* Players list */}
      <div className="bg-gray-800/50 rounded-xl p-4">
        <h3 className="text-gray-400 text-sm mb-3">
          Players ({gameState.players.length}/{gameState.maxPlayers})
        </h3>
        <div className="space-y-2">
          {gameState.players.map((player, index) => (
            <div
              key={player.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                player.id === currentUserId ? 'bg-blue-600/30' : 'bg-gray-700/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-bold',
                    index === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white'
                  )}
                >
                  {index + 1}
                </div>
                <div>
                  <p className="text-white font-semibold">{player.name}</p>
                  {player.isHost && (
                    <span className="text-yellow-500 text-xs">Host</span>
                  )}
                  {player.isAI && (
                    <span className="text-blue-400 text-xs">AI</span>
                  )}
                </div>
              </div>
              {player.id === currentUserId && (
                <span className="text-blue-400 text-sm">You</span>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: gameState.maxPlayers - gameState.players.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-center p-3 rounded-lg bg-gray-700/20 border-2 border-dashed border-gray-600"
            >
              <span className="text-gray-500">Waiting for player...</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {isHost && (
          <>
            <Button
              onClick={onStartGame}
              disabled={!canStart}
              className="w-full"
              size="lg"
              variant="success"
            >
              {canStart ? 'Start Game' : 'Need at least 2 players'}
            </Button>
            {canAddAI && (
              <Button
                onClick={onAddAI}
                className="w-full"
                variant="secondary"
              >
                Add AI Player
              </Button>
            )}
          </>
        )}

        {!isHost && (
          <div className="text-center text-gray-400 py-4">
            Waiting for host to start the game...
          </div>
        )}

        <Button
          onClick={onLeave}
          className="w-full"
          variant="ghost"
        >
          Leave Room
        </Button>
      </div>
    </div>
  );
}
