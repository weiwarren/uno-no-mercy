'use client';

import { useEffect, useRef } from 'react';
import { GameState, Player, Card as CardType, CardColor } from '@/types/game';
import { Card, CardBack } from '@/components/ui/Card';
import { PlayerHand } from './PlayerHand';
import { OpponentHand } from './OpponentHand';
import { GameEventLog } from './GameEventLog';
import { GameAnimations } from './GameAnimations';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/utils';

interface GameBoardProps {
  gameState: GameState;
  currentPlayerId: string;
  playableCards: CardType[];
  isMyTurn: boolean;
  onPlayCard: (card: CardType, selectedColor?: CardColor) => void;
  onPlayMultipleCards?: (cards: CardType[]) => void;
  onDrawCard: () => void;
  onCallUno: () => void;
  onChallengeUno: (targetId: string) => void;
}

export function GameBoard({
  gameState,
  currentPlayerId,
  playableCards,
  isMyTurn,
  onPlayCard,
  onPlayMultipleCards,
  onDrawCard,
  onCallUno,
  onChallengeUno,
}: GameBoardProps) {
  const { playSound } = useSound();
  const prevStateRef = useRef<{ discardLength: number; isMyTurn: boolean; pendingDraw: number } | null>(null);

  // Refs for animation targets
  const discardPileRef = useRef<HTMLDivElement>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const playerHandRef = useRef<HTMLDivElement>(null);

  const myPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  const opponents = gameState.players.filter((p) => p.id !== currentPlayerId);
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Play sounds based on game state changes
  useEffect(() => {
    const prev = prevStateRef.current;

    if (!prev) {
      prevStateRef.current = {
        discardLength: gameState.discardPile.length,
        isMyTurn,
        pendingDraw: gameState.pendingDrawCount,
      };
      return;
    }

    // Card was played
    if (gameState.discardPile.length > prev.discardLength) {
      const playedCard = topCard;
      if (playedCard) {
        if (playedCard.type === 'skip' || playedCard.type === 'skip_everyone') {
          playSound('skip');
        } else if (playedCard.type === 'reverse' || playedCard.type === 'reverse_everyone') {
          playSound('reverse');
        } else if (playedCard.type.includes('draw')) {
          playSound('drawPenalty');
        } else {
          playSound('playCard');
        }
      }
    }

    // It became my turn
    if (isMyTurn && !prev.isMyTurn) {
      playSound('yourTurn');
    }

    // Pending draw increased
    if (gameState.pendingDrawCount > prev.pendingDraw) {
      playSound('drawPenalty');
    }

    prevStateRef.current = {
      discardLength: gameState.discardPile.length,
      isMyTurn,
      pendingDraw: gameState.pendingDrawCount,
    };
  }, [gameState, isMyTurn, topCard, playSound]);

  // Wrapped handlers with sound
  const handlePlayCard = (card: CardType, selectedColor?: CardColor) => {
    onPlayCard(card, selectedColor);
  };

  const handleDrawCard = () => {
    playSound('drawCard');
    onDrawCard();
  };

  const handleCallUno = () => {
    playSound('uno');
    onCallUno();
  };

  // Position opponents based on count
  const getOpponentPositions = () => {
    switch (opponents.length) {
      case 1:
        return [{ position: 'top' as const, player: opponents[0] }];
      case 2:
        return [
          { position: 'left' as const, player: opponents[0] },
          { position: 'right' as const, player: opponents[1] },
        ];
      case 3:
        return [
          { position: 'left' as const, player: opponents[0] },
          { position: 'top' as const, player: opponents[1] },
          { position: 'right' as const, player: opponents[2] },
        ];
      default:
        return opponents.map((player, i) => ({
          position: 'top' as const,
          player,
        }));
    }
  };

  const opponentPositions = getOpponentPositions();

  // Color indicator for current color
  const colorBgClass = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    wild: 'bg-gradient-to-r from-red-500 via-blue-500 to-green-500',
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Game Animations Overlay */}
      <GameAnimations
        gameState={gameState}
        currentPlayerId={currentPlayerId}
        discardPileRef={discardPileRef}
        drawPileRef={drawPileRef}
        playerHandRef={playerHandRef}
      />

      {/* Game Event Log */}
      <GameEventLog gameState={gameState} currentPlayerId={currentPlayerId} />

      {/* Top opponent(s) */}
      <div className="flex justify-center items-start gap-8 py-2 min-h-[100px]">
        {opponentPositions
          .filter((op) => op.position === 'top')
          .map((op) => (
            <OpponentHand
              key={op.player.id}
              player={op.player}
              isCurrentTurn={currentPlayer.id === op.player.id}
              position="top"
              onChallengeUno={() => onChallengeUno(op.player.id)}
            />
          ))}
      </div>

      {/* Middle section with left opponent, center pile, right opponent */}
      <div className="flex-1 flex items-center justify-between px-4">
        {/* Left opponent */}
        <div className="w-32">
          {opponentPositions
            .filter((op) => op.position === 'left')
            .map((op) => (
              <OpponentHand
                key={op.player.id}
                player={op.player}
                isCurrentTurn={currentPlayer.id === op.player.id}
                position="left"
                onChallengeUno={() => onChallengeUno(op.player.id)}
              />
            ))}
        </div>

        {/* Center - Draw pile, Discard pile, Game info */}
        <div className="flex flex-col items-center gap-4">
          {/* Current player indicator */}
          <div className={cn(
            'text-center py-2 px-6 rounded-full text-sm font-bold transition-all',
            isMyTurn
              ? 'bg-green-600 text-white turn-glow float'
              : 'bg-gray-700/80 text-gray-300'
          )}>
            {isMyTurn ? '⭐ Your Turn! ⭐' : `${currentPlayer.name}'s turn`}
          </div>

          {/* Pending draw warning */}
          {gameState.pendingDrawCount > 0 && (
            <div className="bg-red-600 text-white py-2 px-6 rounded-full text-sm font-bold danger-glow shake">
              ⚠️ +{gameState.pendingDrawCount} DRAW PENDING! ⚠️
            </div>
          )}

          {/* Direction indicator */}
          <div className={cn(
            'text-3xl transition-transform duration-300',
            gameState.direction === 1 ? 'text-blue-400' : 'text-orange-400'
          )}>
            {gameState.direction === 1 ? '➡️' : '⬅️'}
          </div>

          {/* Cards area */}
          <div className="flex items-center gap-6">
            {/* Draw pile */}
            <div ref={drawPileRef}>
              <button
                onClick={handleDrawCard}
                disabled={!isMyTurn}
                className={cn(
                  'relative transition-all duration-200',
                  isMyTurn && 'hover:scale-105 cursor-pointer',
                  !isMyTurn && 'opacity-60'
                )}
              >
                <CardBack size="lg" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded">
                  {gameState.drawPile.length}
                </div>
                {isMyTurn && playableCards.length === 0 && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded animate-bounce">
                    Draw!
                  </div>
                )}
              </button>
            </div>

            {/* Discard pile with glow effect */}
            <div
              ref={discardPileRef}
              className={cn(
                'relative rounded-xl transition-all duration-300',
                gameState.currentColor === 'red' && 'drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]',
                gameState.currentColor === 'blue' && 'drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]',
                gameState.currentColor === 'green' && 'drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]',
                gameState.currentColor === 'yellow' && 'drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]',
                gameState.currentColor === 'wild' && 'drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]',
              )}
            >
              {topCard && (
                <div key={topCard.id} className="card-slam">
                  <Card card={topCard} size="lg" />
                </div>
              )}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded">
                {gameState.discardPile.length}
              </div>
            </div>
          </div>

          {/* Current color indicator */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Current Color:</span>
            <div
              className={cn(
                'w-8 h-8 rounded-full border-2 border-white shadow-lg',
                colorBgClass[gameState.currentColor]
              )}
            />
          </div>
        </div>

        {/* Right opponent */}
        <div className="w-32">
          {opponentPositions
            .filter((op) => op.position === 'right')
            .map((op) => (
              <OpponentHand
                key={op.player.id}
                player={op.player}
                isCurrentTurn={currentPlayer.id === op.player.id}
                position="right"
                onChallengeUno={() => onChallengeUno(op.player.id)}
              />
            ))}
        </div>
      </div>

      {/* My hand - overflow visible for card hover effects */}
      <div ref={playerHandRef} className="pt-10 pb-8 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent">
        {myPlayer && (
          <PlayerHand
            cards={myPlayer.cards}
            playableCards={playableCards}
            isMyTurn={isMyTurn}
            onPlayCard={handlePlayCard}
            onPlayMultipleCards={onPlayMultipleCards}
            onCallUno={handleCallUno}
            hasCalledUno={myPlayer.hasCalledUno}
          />
        )}
      </div>
    </div>
  );
}
