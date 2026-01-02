'use client';

import { Player } from '@/types/game';
import { CardBack } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface OpponentHandProps {
  player: Player;
  isCurrentTurn: boolean;
  position: 'top' | 'left' | 'right';
  onChallengeUno?: () => void;
  className?: string;
}

export function OpponentHand({
  player,
  isCurrentTurn,
  position,
  onChallengeUno,
  className,
}: OpponentHandProps) {
  const cardCount = player.cards.length;
  const showUnoChallenge = cardCount === 1 && !player.hasCalledUno && !player.isAI;

  // Calculate how many cards to show (max 7 visible)
  const visibleCards = Math.min(cardCount, 7);

  const getContainerClasses = () => {
    switch (position) {
      case 'top':
        return 'flex-col items-center';
      case 'left':
        return 'flex-row items-center';
      case 'right':
        return 'flex-row-reverse items-center';
      default:
        return '';
    }
  };

  const getCardContainerClasses = () => {
    switch (position) {
      case 'top':
        return 'flex flex-row';
      case 'left':
        return 'flex flex-col';
      case 'right':
        return 'flex flex-col';
      default:
        return '';
    }
  };

  const getCardOverlap = () => {
    switch (position) {
      case 'top':
        return '-ml-8 first:ml-0';
      case 'left':
      case 'right':
        return '-mt-12 first:mt-0';
      default:
        return '';
    }
  };

  return (
    <div className={cn('flex gap-3', getContainerClasses(), className)}>
      {/* Player info */}
      <div
        className={cn(
          'flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300',
          isCurrentTurn && 'bg-yellow-500/20 ring-2 ring-yellow-500 animate-pulse'
        )}
      >
        <span className="text-white font-semibold text-sm truncate max-w-20">
          {player.name}
        </span>
        <span className="text-gray-400 text-xs">
          {cardCount} {cardCount === 1 ? 'card' : 'cards'}
        </span>
        {player.isAI && (
          <span className="text-xs text-blue-400">AI</span>
        )}
        {cardCount === 1 && player.hasCalledUno && (
          <span className="text-red-500 font-bold text-xs animate-bounce">UNO!</span>
        )}
      </div>

      {/* Cards */}
      <div className={cn(getCardContainerClasses())}>
        {Array.from({ length: visibleCards }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'transition-all duration-200',
              getCardOverlap()
            )}
            style={{ zIndex: i }}
          >
            <CardBack size="sm" />
          </div>
        ))}
        {cardCount > 7 && (
          <div className="text-gray-400 text-xs ml-2 self-center">
            +{cardCount - 7}
          </div>
        )}
      </div>

      {/* Challenge UNO button */}
      {showUnoChallenge && onChallengeUno && (
        <button
          onClick={onChallengeUno}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-1 px-3 rounded text-xs animate-pulse"
        >
          Challenge!
        </button>
      )}
    </div>
  );
}
