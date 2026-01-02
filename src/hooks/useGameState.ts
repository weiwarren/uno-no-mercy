'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Card, CardColor, Player } from '@/types/game';
import {
  initializeGame,
  addPlayer,
  startGame,
  playCard,
  playMultipleCards,
  drawCards,
  processDrawPenalty,
  callUno,
  challengeUno,
  canPlayCard,
  canPlayMultipleCards,
  getPlayableCards,
  getStackableCards,
  getCurrentPlayer,
  playDiscardAll,
  generateRoomCode,
} from '@/lib/game-logic';
import { makeAIDecision, getAIDelay, selectBestColor, AIDifficulty } from '@/lib/ai-player';
import { getSupabaseClient, createGame, updateGameState, getGameByRoomCode, subscribeToGame, createGameChannel } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseGameStateOptions {
  playerId: string;
  playerName: string;
  isHost: boolean;
  roomCode?: string;
  isSinglePlayer?: boolean;
  aiDifficulty?: AIDifficulty;
  onError?: (error: string) => void;
}

export function useGameState({
  playerId,
  playerName,
  isHost,
  roomCode,
  isSinglePlayer = false,
  aiDifficulty = 'medium',
  onError,
}: UseGameStateOptions) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string>(playerId);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onErrorRef = useRef(onError);
  const initializedRef = useRef(false);

  // Keep onError ref up to date
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Initialize or join game
  useEffect(() => {
    // Don't initialize until we have a valid player ID
    if (!playerId) {
      return;
    }

    // Prevent re-initialization
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    async function initGame() {
      try {
        setIsLoading(true);

        if (isSinglePlayer) {
          // Create local single player game
          const code = generateRoomCode();
          setActivePlayerId(playerId);
          const state = initializeGame(playerId, playerName, code, 4);

          // Add AI players
          let newState = state;
          const aiNames = ['Bot Alice', 'Bot Bob', 'Bot Carol'];
          for (let i = 0; i < 3; i++) {
            newState = addPlayer(newState, `ai-${i}`, aiNames[i], true);
          }

          // Start immediately
          newState = startGame(newState);
          setGameState(newState);
        } else if (isHost) {
          // Create new multiplayer game
          const supabase = getSupabaseClient();

          // Use the auth user ID directly
          setActivePlayerId(playerId);

          const code = roomCode || generateRoomCode();
          const state = initializeGame(playerId, playerName, code, 4);

          await createGame(supabase, state, playerId);
          setGameState(state);

          // Set up real-time subscription
          const channel = createGameChannel(supabase, state.id);
          channel
            .on('broadcast', { event: 'game_update' }, (message: { payload: { state: GameState } }) => {
              setGameState(message.payload.state);
            })
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'games',
                filter: `id=eq.${state.id}`,
              },
              (payload: { new: Record<string, unknown> | null }) => {
                if (payload.new && 'game_state' in payload.new) {
                  setGameState(payload.new.game_state as GameState);
                }
              }
            )
            .subscribe();

          channelRef.current = channel;
        } else if (roomCode) {
          // Join or rejoin existing game
          const supabase = getSupabaseClient();

          // Use the auth user ID directly
          setActivePlayerId(playerId);

          const dbGame = await getGameByRoomCode(supabase, roomCode);
          let state = dbGame.game_state as GameState;

          // Check if player is already in the game (rejoin scenario)
          const existingPlayer = state.players.find(p => p.id === playerId);

          if (existingPlayer) {
            // Player is rejoining - just use current state
            console.log('Rejoining game as:', existingPlayer.name);
            setGameState(state);
          } else if (state.status === 'waiting') {
            // New player joining a waiting game
            state = addPlayer(state, playerId, playerName);
            await updateGameState(supabase, dbGame.id, state);
            setGameState(state);
          } else {
            // Game already started and player wasn't in it
            throw new Error('Cannot join a game that has already started');
          }

          // Set up real-time subscription
          const channel = createGameChannel(supabase, dbGame.id);
          channel
            .on('broadcast', { event: 'game_update' }, (message: { payload: { state: GameState } }) => {
              setGameState(message.payload.state);
            })
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'games',
                filter: `id=eq.${dbGame.id}`,
              },
              (payload: { new: Record<string, unknown> | null }) => {
                if (payload.new && 'game_state' in payload.new) {
                  setGameState(payload.new.game_state as GameState);
                }
              }
            )
            .subscribe(async (status: string) => {
              // Once subscribed, broadcast that we joined so host sees us
              if (status === 'SUBSCRIBED') {
                await channel.send({
                  type: 'broadcast',
                  event: 'game_update',
                  payload: { state },
                });
              }
            });

          channelRef.current = channel;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize game';
        setError(message);
        onErrorRef.current?.(message);
      } finally {
        setIsLoading(false);
      }
    }

    initGame();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [playerId, playerName, isHost, roomCode, isSinglePlayer]);

  // Handle AI turns
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing' || !isSinglePlayer) return;

    const currentPlayer = getCurrentPlayer(gameState);
    if (!currentPlayer.isAI) return;

    // Clear any existing timeout
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }

    // Schedule AI action
    aiTimeoutRef.current = setTimeout(() => {
      try {
        // Handle pending draw first
        if (gameState.pendingDrawCount > 0) {
          const decision = makeAIDecision(gameState, currentPlayer.id, aiDifficulty);
          if (decision.action === 'play' && decision.card) {
            // AI can stack
            let newState = playCard(gameState, currentPlayer.id, decision.card, decision.selectedColor);
            setGameState(newState);
          } else {
            // AI must draw
            let newState = processDrawPenalty(gameState);
            setGameState(newState);
          }
          return;
        }

        const decision = makeAIDecision(gameState, currentPlayer.id, aiDifficulty);

        let newState = gameState;

        if (decision.action === 'draw') {
          // Draw until can play (No Mercy rule)
          let canPlay = false;
          let drawCount = 0;
          const maxDraws = 10; // Safety limit

          while (!canPlay && drawCount < maxDraws) {
            newState = drawCards(newState, currentPlayer.id, 1);
            const updatedPlayer = newState.players.find(p => p.id === currentPlayer.id);
            if (updatedPlayer) {
              const playable = getPlayableCards(newState, currentPlayer.id);
              canPlay = playable.length > 0;
            }
            drawCount++;
          }

          // If can play after drawing, make another decision
          if (canPlay) {
            const newDecision = makeAIDecision(newState, currentPlayer.id, aiDifficulty);
            if (newDecision.card) {
              newState = playCard(newState, currentPlayer.id, newDecision.card, newDecision.selectedColor);
            }
          }
        } else if (decision.card) {
          // Call UNO if needed
          if (decision.action === 'call_uno') {
            newState = callUno(gameState, currentPlayer.id);
          }

          // Handle discard all
          if (decision.card.type === 'discard_all' && decision.cards) {
            newState = playDiscardAll(newState, currentPlayer.id, decision.cards);
          } else {
            newState = playCard(newState, currentPlayer.id, decision.card, decision.selectedColor);
          }
        }

        setGameState(newState);
      } catch (err) {
        console.error('AI action error:', err);
      }
    }, getAIDelay(aiDifficulty));

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [gameState, isSinglePlayer, aiDifficulty]);

  // Broadcast state update for multiplayer
  const broadcastUpdate = useCallback(
    async (newState: GameState) => {
      if (isSinglePlayer || !channelRef.current) return;

      try {
        const supabase = getSupabaseClient();
        await updateGameState(supabase, newState.id, newState);

        channelRef.current.send({
          type: 'broadcast',
          event: 'game_update',
          payload: { state: newState },
        });
      } catch (err) {
        console.error('Failed to broadcast update:', err);
      }
    },
    [isSinglePlayer]
  );

  // Game actions
  const handlePlayCard = useCallback(
    (card: Card, selectedColor?: CardColor) => {
      if (!gameState) return;

      try {
        let newState = playCard(gameState, activePlayerId, card, selectedColor);
        setGameState(newState);
        broadcastUpdate(newState);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to play card';
        setError(message);
        onErrorRef.current?.(message);
      }
    },
    [gameState, activePlayerId, broadcastUpdate, onError]
  );

  const handlePlayMultipleCards = useCallback(
    (cards: Card[]) => {
      if (!gameState) return;

      try {
        let newState = playMultipleCards(gameState, activePlayerId, cards);
        setGameState(newState);
        broadcastUpdate(newState);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to play cards';
        setError(message);
        onErrorRef.current?.(message);
      }
    },
    [gameState, activePlayerId, broadcastUpdate, onError]
  );

  const handleDrawCard = useCallback(() => {
    if (!gameState) return;

    try {
      let newState = gameState;

      // Handle pending draw penalty
      if (gameState.pendingDrawCount > 0) {
        newState = processDrawPenalty(gameState);
        setGameState(newState);
        broadcastUpdate(newState);
        return;
      }

      // No Mercy rule: Draw until you can play
      let canPlay = false;
      let drawCount = 0;
      const maxDraws = 10;

      while (!canPlay && drawCount < maxDraws) {
        newState = drawCards(newState, activePlayerId, 1);
        const playable = getPlayableCards(newState, activePlayerId);
        canPlay = playable.length > 0;
        drawCount++;
      }

      setGameState(newState);
      broadcastUpdate(newState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to draw card';
      setError(message);
      onErrorRef.current?.(message);
    }
  }, [gameState, activePlayerId, broadcastUpdate, onError]);

  const handleCallUno = useCallback(() => {
    if (!gameState) return;

    try {
      const newState = callUno(gameState, activePlayerId);
      setGameState(newState);
      broadcastUpdate(newState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to call UNO';
      setError(message);
      onErrorRef.current?.(message);
    }
  }, [gameState, activePlayerId, broadcastUpdate, onError]);

  const handleChallengeUno = useCallback(
    (targetId: string) => {
      if (!gameState) return;

      try {
        const newState = challengeUno(gameState, activePlayerId, targetId);
        setGameState(newState);
        broadcastUpdate(newState);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to challenge UNO';
        setError(message);
        onErrorRef.current?.(message);
      }
    },
    [gameState, activePlayerId, broadcastUpdate, onError]
  );

  const handleDiscardAll = useCallback(
    (cards: Card[]) => {
      if (!gameState) return;

      try {
        const newState = playDiscardAll(gameState, activePlayerId, cards);
        setGameState(newState);
        broadcastUpdate(newState);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to discard all';
        setError(message);
        onErrorRef.current?.(message);
      }
    },
    [gameState, activePlayerId, broadcastUpdate, onError]
  );

  const handleStartGame = useCallback(async () => {
    if (!gameState) return;

    try {
      const newState = startGame(gameState);
      setGameState(newState);
      await broadcastUpdate(newState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      setError(message);
      onErrorRef.current?.(message);
    }
  }, [gameState, broadcastUpdate, onError]);

  // Helper getters
  const currentPlayer = gameState ? getCurrentPlayer(gameState) : null;
  const isMyTurn = currentPlayer?.id === activePlayerId;
  const myPlayer = gameState?.players.find((p) => p.id === activePlayerId);
  const playableCards = gameState ? getPlayableCards(gameState, activePlayerId) : [];

  // Get stackable cards for a given card
  const getStackable = useCallback(
    (card: Card) => {
      if (!myPlayer) return [card];
      return getStackableCards(myPlayer.cards, card);
    },
    [myPlayer]
  );

  return {
    gameState,
    isLoading,
    error,
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
    handleDiscardAll,
    handleStartGame,
    canPlayCard: (card: Card) => gameState ? canPlayCard(gameState, card, activePlayerId) : false,
    canPlayMultiple: (cards: Card[]) => gameState ? canPlayMultipleCards(gameState, cards, activePlayerId) : false,
    getStackableCards: getStackable,
  };
}
