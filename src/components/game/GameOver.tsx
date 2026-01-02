'use client';

import { GameState } from '@/types/game';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface GameOverProps {
  gameState: GameState;
  currentUserId: string;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export function GameOver({
  gameState,
  currentUserId,
  onPlayAgain,
  onBackToLobby,
}: GameOverProps) {
  const winner = gameState.players.find((p) => p.id === gameState.winnerId);
  const isWinner = gameState.winnerId === currentUserId;

  // Sort players by card count (fewer cards = better)
  const rankings = [...gameState.players].sort((a, b) => {
    if (a.id === gameState.winnerId) return -1;
    if (b.id === gameState.winnerId) return 1;
    return a.cards.length - b.cards.length;
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
        {/* Winner announcement */}
        <div className={cn(
          'text-6xl mb-4',
          isWinner ? 'animate-bounce' : ''
        )}>
          {isWinner ? '🎉' : '🏆'}
        </div>
        <h2 className={cn(
          'text-3xl font-black mb-2',
          isWinner
            ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500'
            : 'text-white'
        )}>
          {isWinner ? 'YOU WIN!' : `${winner?.name} Wins!`}
        </h2>
        <p className="text-gray-400 mb-6">
          {isWinner
            ? 'No mercy was shown!'
            : 'Better luck next time!'}
        </p>

        {/* Rankings */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h3 className="text-gray-400 text-sm mb-3">Final Rankings</h3>
          <div className="space-y-2">
            {rankings.map((player, index) => (
              <div
                key={player.id}
                className={cn(
                  'flex items-center justify-between p-2 rounded-lg',
                  player.id === currentUserId ? 'bg-blue-600/30' : 'bg-gray-700/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold',
                    index === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white'
                  )}>
                    {index + 1}
                  </span>
                  <span className="text-white">{player.name}</span>
                  {player.id === gameState.winnerId && (
                    <span className="text-yellow-500">👑</span>
                  )}
                </div>
                <span className="text-gray-400 text-sm">
                  {player.id === gameState.winnerId
                    ? 'Winner!'
                    : `${player.cards.length} cards`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onPlayAgain}
            className="w-full"
            size="lg"
            variant="success"
          >
            Play Again
          </Button>
          <Button
            onClick={onBackToLobby}
            className="w-full"
            variant="ghost"
          >
            Back to Lobby
          </Button>
        </div>
      </div>
    </div>
  );
}
