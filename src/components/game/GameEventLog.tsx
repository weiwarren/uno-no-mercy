'use client';

import { useEffect, useState, useRef } from 'react';
import { GameState, Card } from '@/types/game';
import { cn } from '@/lib/utils';

interface GameEvent {
  id: string;
  message: string;
  type: 'play' | 'draw' | 'skip' | 'reverse' | 'uno' | 'penalty' | 'info' | 'win';
  timestamp: number;
}

interface GameEventLogProps {
  gameState: GameState;
  currentPlayerId: string;
}

function getCardDescription(card: Card): string {
  const colorName = card.color === 'wild' ? '' : card.color.charAt(0).toUpperCase() + card.color.slice(1) + ' ';

  switch (card.type) {
    case 'number':
      return `${colorName}${card.value}`;
    case 'skip':
      return `${colorName}Skip`;
    case 'reverse':
      return `${colorName}Reverse`;
    case 'draw2':
      return `${colorName}+2`;
    case 'draw4':
      return 'Wild +4';
    case 'draw6':
      return `${colorName}+6`;
    case 'draw10':
      return `${colorName}+10`;
    case 'wild':
      return 'Wild';
    case 'wild_draw2':
      return 'Wild +2';
    case 'wild_draw4':
      return 'Wild +4';
    case 'skip_everyone':
      return `${colorName}Skip Everyone`;
    case 'discard_all':
      return `${colorName}Discard All`;
    case 'color_roulette':
      return 'Color Roulette';
    default:
      return 'Card';
  }
}

export function GameEventLog({ gameState, currentPlayerId }: GameEventLogProps) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const prevStateRef = useRef<GameState | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevState = prevStateRef.current;

    if (!prevState) {
      prevStateRef.current = gameState;
      // Initial event
      setEvents([{
        id: crypto.randomUUID(),
        message: 'Game started!',
        type: 'info',
        timestamp: Date.now(),
      }]);
      return;
    }

    const newEvents: GameEvent[] = [];
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const prevPlayer = prevState.players[prevState.currentPlayerIndex];

    // Check if a card was played
    if (gameState.discardPile.length > prevState.discardPile.length) {
      const playedCard = gameState.discardPile[gameState.discardPile.length - 1];
      const playerWhoPlayed = prevState.players[prevState.currentPlayerIndex];
      const isMe = playerWhoPlayed.id === currentPlayerId;

      let eventType: GameEvent['type'] = 'play';
      if (playedCard.type === 'skip' || playedCard.type === 'skip_everyone') {
        eventType = 'skip';
      } else if (playedCard.type === 'reverse' || playedCard.type === 'reverse_everyone') {
        eventType = 'reverse';
      } else if (playedCard.type.includes('draw')) {
        eventType = 'penalty';
      }

      newEvents.push({
        id: crypto.randomUUID(),
        message: `${isMe ? 'You' : playerWhoPlayed.name} played ${getCardDescription(playedCard)}`,
        type: eventType,
        timestamp: Date.now(),
      });
    }

    // Check if someone drew cards
    for (const player of gameState.players) {
      const prevPlayerData = prevState.players.find(p => p.id === player.id);
      if (prevPlayerData && player.cards.length > prevPlayerData.cards.length) {
        const drawnCount = player.cards.length - prevPlayerData.cards.length;
        const isMe = player.id === currentPlayerId;

        if (drawnCount > 1) {
          newEvents.push({
            id: crypto.randomUUID(),
            message: `${isMe ? 'You' : player.name} drew ${drawnCount} cards!`,
            type: 'penalty',
            timestamp: Date.now(),
          });
        } else {
          newEvents.push({
            id: crypto.randomUUID(),
            message: `${isMe ? 'You' : player.name} drew a card`,
            type: 'draw',
            timestamp: Date.now(),
          });
        }
      }
    }

    // Check for UNO calls
    for (const player of gameState.players) {
      const prevPlayerData = prevState.players.find(p => p.id === player.id);
      if (prevPlayerData && player.hasCalledUno && !prevPlayerData.hasCalledUno) {
        const isMe = player.id === currentPlayerId;
        newEvents.push({
          id: crypto.randomUUID(),
          message: `${isMe ? 'You' : player.name} called UNO!`,
          type: 'uno',
          timestamp: Date.now(),
        });
      }
    }

    // Check for winner
    if (gameState.status === 'finished' && prevState.status !== 'finished') {
      const winner = gameState.players.find(p => p.cards.length === 0);
      if (winner) {
        const isMe = winner.id === currentPlayerId;
        newEvents.push({
          id: crypto.randomUUID(),
          message: isMe ? 'You won!' : `${winner.name} wins!`,
          type: 'win',
          timestamp: Date.now(),
        });
      }
    }

    // Check for turn change
    if (currentPlayer.id !== prevPlayer.id && newEvents.length === 0) {
      const isMyTurn = currentPlayer.id === currentPlayerId;
      if (isMyTurn) {
        newEvents.push({
          id: crypto.randomUUID(),
          message: "Your turn!",
          type: 'info',
          timestamp: Date.now(),
        });
      }
    }

    if (newEvents.length > 0) {
      setEvents(prev => [...prev.slice(-20), ...newEvents]); // Keep last 20 events
    }

    prevStateRef.current = gameState;
  }, [gameState, currentPlayerId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  const eventStyles: Record<GameEvent['type'], string> = {
    play: 'text-white bg-gray-700',
    draw: 'text-gray-300 bg-gray-800',
    skip: 'text-orange-300 bg-orange-900/50',
    reverse: 'text-purple-300 bg-purple-900/50',
    uno: 'text-yellow-300 bg-yellow-900/50 font-bold',
    penalty: 'text-red-300 bg-red-900/50',
    info: 'text-blue-300 bg-blue-900/50',
    win: 'text-green-300 bg-green-900/50 font-bold',
  };

  return (
    <div className="absolute top-2 right-2 w-64 max-h-48 bg-black/60 backdrop-blur-sm rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-3 py-1.5 bg-gray-800/80 border-b border-gray-700 text-xs font-semibold text-gray-300">
        Game Log
      </div>
      <div
        ref={logRef}
        className="p-2 space-y-1 overflow-y-auto max-h-36 text-xs"
      >
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              'px-2 py-1 rounded transition-all duration-300 animate-in slide-in-from-right-2',
              eventStyles[event.type]
            )}
          >
            {event.message}
          </div>
        ))}
      </div>
    </div>
  );
}
