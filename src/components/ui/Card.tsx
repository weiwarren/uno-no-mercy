'use client';

import { Card as CardType, CardColor, CardType as CardTypeEnum } from '@/types/game';
import { cn } from '@/lib/utils';

interface CardProps {
  card: CardType;
  isPlayable?: boolean;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  onClick?: () => void;
  className?: string;
}

const colorClasses: Record<CardColor, string> = {
  red: 'bg-gradient-to-br from-red-400 to-red-600 border-red-800',
  blue: 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-800',
  green: 'bg-gradient-to-br from-green-400 to-green-600 border-green-800',
  yellow: 'bg-gradient-to-br from-yellow-300 to-yellow-500 border-yellow-700 text-black',
  wild: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 border-purple-800',
};

const sizeClasses = {
  sm: 'w-12 h-[72px] text-xs',
  md: 'w-20 h-[120px] text-sm',
  lg: 'w-24 h-[144px] text-base',
};

function getCardSymbol(type: CardTypeEnum, value?: number): string {
  switch (type) {
    case 'number':
      return value?.toString() || '0';
    case 'skip':
      return '⊘';
    case 'reverse':
      return '⇄';
    case 'draw2':
      return '+2';
    case 'draw4':
      return '+4';
    case 'draw6':
      return '+6';
    case 'draw10':
      return '+10';
    case 'wild':
      return '★';
    case 'wild_draw2':
      return '★+2';
    case 'wild_draw4':
      return '★+4';
    case 'wild_draw_color':
      return '★+C';
    case 'skip_everyone':
      return '⊘⊘';
    case 'reverse_everyone':
      return '⇄⇄';
    case 'discard_all':
      return '✕✕';
    case 'color_roulette':
      return '🎲';
    default:
      return '?';
  }
}

function getCardName(type: CardTypeEnum, value?: number): string {
  switch (type) {
    case 'number':
      return value?.toString() || '0';
    case 'skip':
      return 'Skip';
    case 'reverse':
      return 'Reverse';
    case 'draw2':
      return 'Draw 2';
    case 'draw4':
      return 'Draw 4';
    case 'draw6':
      return 'Draw 6';
    case 'draw10':
      return 'Draw 10';
    case 'wild':
      return 'Wild';
    case 'wild_draw2':
      return 'Wild +2';
    case 'wild_draw4':
      return 'Wild +4';
    case 'wild_draw_color':
      return 'Wild Draw Color';
    case 'skip_everyone':
      return 'Skip All';
    case 'reverse_everyone':
      return 'Reverse All';
    case 'discard_all':
      return 'Discard All';
    case 'color_roulette':
      return 'Roulette';
    default:
      return 'Unknown';
  }
}

export function Card({
  card,
  isPlayable = false,
  isSelected = false,
  size = 'md',
  faceDown = false,
  onClick,
  className,
}: CardProps) {
  if (faceDown) {
    return (
      <div
        className={cn(
          'rounded-lg border-2 flex items-center justify-center font-bold shadow-lg transition-all duration-200',
          'bg-gray-800 border-gray-600 text-white',
          sizeClasses[size],
          className
        )}
      >
        <div className="text-2xl">UNO</div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={!isPlayable && onClick !== undefined}
      className={cn(
        'rounded-xl border-3 flex flex-col items-center justify-center font-bold transition-all duration-200 text-white relative overflow-hidden',
        'shadow-[0_4px_8px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.3)]',
        colorClasses[card.color],
        sizeClasses[size],
        isPlayable && 'cursor-pointer hover:scale-110 hover:-translate-y-3 hover:shadow-[0_12px_24px_rgba(0,0,0,0.6)] ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900 z-10',
        isSelected && 'scale-110 -translate-y-4 ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-900 z-20',
        !isPlayable && onClick !== undefined && 'brightness-50 saturate-50 cursor-not-allowed',
        className
      )}
    >
      {/* Inner white ellipse - UNO style */}
      <div className="absolute inset-[6px] bg-white rounded-[40%] transform rotate-[15deg] opacity-95" />

      {/* Card content on top of ellipse */}
      <div className={cn(
        'relative z-10 flex flex-col items-center',
        card.color === 'yellow' ? 'text-black' : colorClasses[card.color].includes('text-black') ? 'text-black' : ''
      )}>
        <span className={cn(
          'font-black drop-shadow-sm',
          card.color !== 'yellow' && 'text-inherit',
          card.color === 'yellow' && 'text-yellow-600',
          card.color === 'wild' && 'text-purple-600',
          card.color === 'red' && 'text-red-600',
          card.color === 'blue' && 'text-blue-600',
          card.color === 'green' && 'text-green-600',
          size === 'sm' && 'text-lg',
          size === 'md' && 'text-3xl',
          size === 'lg' && 'text-4xl'
        )}>
          {getCardSymbol(card.type, card.value)}
        </span>
        {size !== 'sm' && (
          <span className={cn(
            'mt-0.5 font-semibold',
            size === 'md' && 'text-[10px]',
            size === 'lg' && 'text-xs',
            card.color === 'yellow' && 'text-yellow-700',
            card.color === 'wild' && 'text-purple-700',
            card.color === 'red' && 'text-red-700',
            card.color === 'blue' && 'text-blue-700',
            card.color === 'green' && 'text-green-700',
          )}>
            {getCardName(card.type, card.value)}
          </span>
        )}
      </div>

      {/* Corner symbols */}
      <span className={cn(
        'absolute top-1.5 left-2 font-bold',
        size === 'sm' && 'text-[8px]',
        size === 'md' && 'text-xs',
        size === 'lg' && 'text-sm',
      )}>
        {getCardSymbol(card.type, card.value)}
      </span>
      <span className={cn(
        'absolute bottom-1.5 right-2 font-bold rotate-180',
        size === 'sm' && 'text-[8px]',
        size === 'md' && 'text-xs',
        size === 'lg' && 'text-sm',
      )}>
        {getCardSymbol(card.type, card.value)}
      </span>
    </button>
  );
}

export function CardBack({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border-3 flex items-center justify-center font-bold bg-gradient-to-br from-gray-700 to-gray-900 border-gray-600',
        'shadow-[0_4px_8px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.3)]',
        'relative overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {/* Inner pattern */}
      <div className="absolute inset-[8px] bg-red-600 rounded-[40%] transform rotate-[15deg] flex items-center justify-center">
        <div className="absolute inset-1.5 border-2 border-yellow-400 rounded-[35%]" />
      </div>
      <div className={cn(
        'font-black text-yellow-400 relative z-10 drop-shadow-lg',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-xl',
        size === 'lg' && 'text-2xl'
      )}>
        UNO
      </div>
    </div>
  );
}
