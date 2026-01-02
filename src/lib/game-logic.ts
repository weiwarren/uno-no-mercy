import { v4 as uuidv4 } from 'uuid';
import { Card, CardColor, CardType, GameState, Player, Direction, GameAction } from '@/types/game';

// UNO No Mercy Deck Composition (168 cards)
const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];

export function createDeck(): Card[] {
  const deck: Card[] = [];

  // Number cards (0-9) for each color
  // One 0 per color, two of each 1-9 per color
  for (const color of COLORS) {
    // One 0
    deck.push({ id: uuidv4(), type: 'number', color, value: 0 });

    // Two of each 1-9
    for (let i = 1; i <= 9; i++) {
      deck.push({ id: uuidv4(), type: 'number', color, value: i });
      deck.push({ id: uuidv4(), type: 'number', color, value: i });
    }

    // Action cards (2 of each per color)
    for (let i = 0; i < 2; i++) {
      deck.push({ id: uuidv4(), type: 'skip', color });
      deck.push({ id: uuidv4(), type: 'reverse', color });
      deck.push({ id: uuidv4(), type: 'draw2', color });
    }

    // No Mercy special cards (1 of each per color)
    deck.push({ id: uuidv4(), type: 'draw6', color });
    deck.push({ id: uuidv4(), type: 'skip_everyone', color });
    deck.push({ id: uuidv4(), type: 'discard_all', color });
  }

  // Wild cards (No Mercy has more wilds)
  for (let i = 0; i < 4; i++) {
    deck.push({ id: uuidv4(), type: 'wild', color: 'wild' });
    deck.push({ id: uuidv4(), type: 'wild_draw4', color: 'wild' });
  }

  // Additional No Mercy wild cards
  for (let i = 0; i < 2; i++) {
    deck.push({ id: uuidv4(), type: 'wild_draw2', color: 'wild' });
    deck.push({ id: uuidv4(), type: 'wild_draw_color', color: 'wild' });
    deck.push({ id: uuidv4(), type: 'draw10', color: 'wild' });
    deck.push({ id: uuidv4(), type: 'color_roulette', color: 'wild' });
    deck.push({ id: uuidv4(), type: 'reverse_everyone', color: 'wild' });
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[], numCards: number): { dealt: Card[]; remaining: Card[] } {
  const dealt = deck.slice(0, numCards);
  const remaining = deck.slice(numCards);
  return { dealt, remaining };
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function initializeGame(hostId: string, hostName: string, roomCode: string, maxPlayers: number = 4): GameState {
  const deck = shuffleDeck(createDeck());

  // Deal 7 cards to host
  const { dealt: hostCards, remaining: afterHostDeal } = dealCards(deck, 7);

  // Find a valid starting card (must be a number card)
  let startingCardIndex = afterHostDeal.findIndex(
    card => card.type === 'number'
  );
  if (startingCardIndex === -1) startingCardIndex = 0;

  const startingCard = afterHostDeal[startingCardIndex];
  const drawPile = [
    ...afterHostDeal.slice(0, startingCardIndex),
    ...afterHostDeal.slice(startingCardIndex + 1)
  ];

  const host: Player = {
    id: hostId,
    name: hostName,
    cards: hostCards,
    isAI: false,
    isHost: true,
    isConnected: true,
    hasCalledUno: false,
  };

  return {
    id: uuidv4(),
    status: 'waiting',
    players: [host],
    currentPlayerIndex: 0,
    direction: 1,
    drawPile,
    discardPile: [startingCard],
    currentColor: startingCard.color === 'wild' ? 'red' : startingCard.color,
    pendingDrawCount: 0,
    pendingDrawType: null,
    winnerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hostId,
    roomCode,
    maxPlayers,
    isPrivate: false,
  };
}

export function addPlayer(state: GameState, playerId: string, playerName: string, isAI: boolean = false): GameState {
  if (state.players.length >= state.maxPlayers) {
    throw new Error('Game is full');
  }
  if (state.status !== 'waiting') {
    throw new Error('Game has already started');
  }

  const newPlayer: Player = {
    id: playerId,
    name: playerName,
    cards: [],
    isAI,
    isHost: false,
    isConnected: true,
    hasCalledUno: false,
  };

  return {
    ...state,
    players: [...state.players, newPlayer],
    updatedAt: new Date().toISOString(),
  };
}

export function startGame(state: GameState): GameState {
  if (state.status !== 'waiting') {
    throw new Error('Game has already started');
  }
  if (state.players.length < 2) {
    throw new Error('Need at least 2 players to start');
  }

  // Create fresh deck and shuffle
  let deck = shuffleDeck(createDeck());

  // Deal 7 cards to each player
  const updatedPlayers = state.players.map(player => {
    const { dealt, remaining } = dealCards(deck, 7);
    deck = remaining;
    return {
      ...player,
      cards: dealt,
      hasCalledUno: false,
    };
  });

  // Find starting card (must be a number card)
  let startingCardIndex = deck.findIndex(card => card.type === 'number');
  if (startingCardIndex === -1) startingCardIndex = 0;

  const startingCard = deck[startingCardIndex];
  const drawPile = [
    ...deck.slice(0, startingCardIndex),
    ...deck.slice(startingCardIndex + 1)
  ];

  return {
    ...state,
    status: 'playing',
    players: updatedPlayers,
    currentPlayerIndex: 0,
    direction: 1,
    drawPile,
    discardPile: [startingCard],
    currentColor: startingCard.color === 'wild' ? 'red' : startingCard.color,
    pendingDrawCount: 0,
    pendingDrawType: null,
    updatedAt: new Date().toISOString(),
  };
}

export function getTopCard(state: GameState): Card | undefined {
  return state.discardPile[state.discardPile.length - 1];
}

export function canPlayCard(state: GameState, card: Card, playerId: string): boolean {
  const topCard = getTopCard(state);
  if (!topCard) return true;

  // Check if it's the player's turn
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return false;

  // If there's a pending draw, only draw cards can be played to stack
  if (state.pendingDrawCount > 0 && state.pendingDrawType) {
    return canStackDrawCard(card, state.pendingDrawType);
  }

  // Wild cards can always be played
  if (card.color === 'wild') return true;

  // Match color
  if (card.color === state.currentColor) return true;

  // Match number
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
    return true;
  }

  // Match action type
  if (card.type === topCard.type && card.type !== 'number') return true;

  return false;
}

function canStackDrawCard(card: Card, pendingType: CardType): boolean {
  const drawTypes: CardType[] = ['draw2', 'draw4', 'draw6', 'draw10', 'wild_draw2', 'wild_draw4', 'wild_draw_color'];

  if (!drawTypes.includes(card.type)) return false;

  // In No Mercy, draw cards stack on same or higher value
  const drawValues: Record<CardType, number> = {
    'draw2': 2,
    'wild_draw2': 2,
    'draw4': 4,
    'wild_draw4': 4,
    'draw6': 6,
    'wild_draw_color': 4, // Counts as +4
    'draw10': 10,
    'number': 0,
    'skip': 0,
    'reverse': 0,
    'wild': 0,
    'skip_everyone': 0,
    'reverse_everyone': 0,
    'discard_all': 0,
    'color_roulette': 0,
  };

  return drawValues[card.type] >= drawValues[pendingType];
}

function getDrawCount(cardType: CardType): number {
  const drawCounts: Record<CardType, number> = {
    'draw2': 2,
    'wild_draw2': 2,
    'draw4': 4,
    'wild_draw4': 4,
    'draw6': 6,
    'wild_draw_color': 4,
    'draw10': 10,
    'number': 0,
    'skip': 0,
    'reverse': 0,
    'wild': 0,
    'skip_everyone': 0,
    'reverse_everyone': 0,
    'discard_all': 0,
    'color_roulette': 0,
  };
  return drawCounts[cardType];
}

function isDrawCard(cardType: CardType): boolean {
  return getDrawCount(cardType) > 0;
}

export function getNextPlayerIndex(state: GameState, skip: number = 1): number {
  const numPlayers = state.players.length;
  let next = state.currentPlayerIndex;
  for (let i = 0; i < skip; i++) {
    next = (next + state.direction + numPlayers) % numPlayers;
  }
  return next;
}

export function drawCards(state: GameState, playerId: string, count: number): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) throw new Error('Player not found');

  let newDrawPile = [...state.drawPile];
  let newDiscardPile = [...state.discardPile];
  const drawnCards: Card[] = [];

  for (let i = 0; i < count; i++) {
    // Reshuffle discard pile if draw pile is empty
    if (newDrawPile.length === 0) {
      const topCard = newDiscardPile.pop();
      newDrawPile = shuffleDeck(newDiscardPile.map(card => ({
        ...card,
        id: uuidv4(), // New IDs to prevent tracking
      })));
      newDiscardPile = topCard ? [topCard] : [];
    }

    if (newDrawPile.length > 0) {
      drawnCards.push(newDrawPile.pop()!);
    }
  }

  const newPlayers = state.players.map((p, idx) => {
    if (idx === playerIndex) {
      return {
        ...p,
        cards: [...p.cards, ...drawnCards],
        hasCalledUno: false, // Reset UNO call when drawing
      };
    }
    return p;
  });

  // Check for 25 card elimination rule
  const updatedPlayer = newPlayers[playerIndex];
  if (updatedPlayer.cards.length >= 25) {
    // Player is eliminated - remove them and redistribute their cards
    return eliminatePlayer(
      { ...state, players: newPlayers, drawPile: newDrawPile, discardPile: newDiscardPile },
      playerId
    );
  }

  return {
    ...state,
    players: newPlayers,
    drawPile: newDrawPile,
    discardPile: newDiscardPile,
    updatedAt: new Date().toISOString(),
  };
}

function eliminatePlayer(state: GameState, playerId: string): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return state;

  const eliminatedPlayer = state.players[playerIndex];
  const remainingPlayers = state.players.filter(p => p.id !== playerId);

  // Add eliminated player's cards back to draw pile
  const newDrawPile = shuffleDeck([...state.drawPile, ...eliminatedPlayer.cards]);

  // Adjust current player index
  let newCurrentIndex = state.currentPlayerIndex;
  if (playerIndex < state.currentPlayerIndex) {
    newCurrentIndex--;
  } else if (playerIndex === state.currentPlayerIndex) {
    newCurrentIndex = newCurrentIndex % remainingPlayers.length;
  }

  // Check if game should end
  if (remainingPlayers.length === 1) {
    return {
      ...state,
      status: 'finished',
      players: remainingPlayers,
      winnerId: remainingPlayers[0].id,
      drawPile: newDrawPile,
      currentPlayerIndex: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...state,
    players: remainingPlayers,
    drawPile: newDrawPile,
    currentPlayerIndex: newCurrentIndex,
    updatedAt: new Date().toISOString(),
  };
}

export function playCard(state: GameState, playerId: string, card: Card, selectedColor?: CardColor): GameState {
  if (!canPlayCard(state, card, playerId)) {
    throw new Error('Cannot play this card');
  }

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  const player = state.players[playerIndex];

  // Remove card from player's hand
  const newCards = player.cards.filter(c => c.id !== card.id);

  let newState: GameState = {
    ...state,
    discardPile: [...state.discardPile, card],
    players: state.players.map((p, idx) =>
      idx === playerIndex ? { ...p, cards: newCards } : p
    ),
    updatedAt: new Date().toISOString(),
  };

  // Handle card effects
  newState = handleCardEffect(newState, card, playerId, selectedColor);

  // Check for winner
  if (newCards.length === 0) {
    newState = {
      ...newState,
      status: 'finished',
      winnerId: playerId,
    };
  }

  return newState;
}

function handleCardEffect(state: GameState, card: Card, playerId: string, selectedColor?: CardColor): GameState {
  let newState = { ...state };

  // Update current color
  if (card.color === 'wild' && selectedColor) {
    newState.currentColor = selectedColor;
  } else if (card.color !== 'wild') {
    newState.currentColor = card.color;
  }

  // Handle special card effects
  switch (card.type) {
    case 'skip':
      newState.currentPlayerIndex = getNextPlayerIndex(newState, 2);
      break;

    case 'reverse':
      if (state.players.length === 2) {
        // In 2 player game, reverse acts like skip
        newState.currentPlayerIndex = getNextPlayerIndex(newState, 2);
      } else {
        newState.direction = (state.direction * -1) as Direction;
        newState.currentPlayerIndex = getNextPlayerIndex(newState);
      }
      break;

    case 'skip_everyone':
      // Skip all players, current player plays again
      // No change to currentPlayerIndex
      break;

    case 'reverse_everyone':
      newState.direction = (state.direction * -1) as Direction;
      // Current player plays again after reversing
      break;

    case 'draw2':
    case 'wild_draw2':
      newState.pendingDrawCount = state.pendingDrawCount + 2;
      newState.pendingDrawType = card.type;
      newState.currentPlayerIndex = getNextPlayerIndex(newState);
      break;

    case 'draw4':
    case 'wild_draw4':
      newState.pendingDrawCount = state.pendingDrawCount + 4;
      newState.pendingDrawType = card.type;
      newState.currentPlayerIndex = getNextPlayerIndex(newState);
      break;

    case 'draw6':
      newState.pendingDrawCount = state.pendingDrawCount + 6;
      newState.pendingDrawType = card.type;
      newState.currentPlayerIndex = getNextPlayerIndex(newState);
      break;

    case 'draw10':
      newState.pendingDrawCount = state.pendingDrawCount + 10;
      newState.pendingDrawType = card.type;
      newState.currentPlayerIndex = getNextPlayerIndex(newState);
      break;

    case 'wild_draw_color':
      // Draw until you get the selected color
      // This is handled separately in the game flow
      newState.pendingDrawCount = state.pendingDrawCount + 4; // Base +4
      newState.pendingDrawType = card.type;
      newState.currentPlayerIndex = getNextPlayerIndex(newState);
      break;

    case 'color_roulette':
      // Random color selection
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      newState.currentColor = randomColor;
      newState.currentPlayerIndex = getNextPlayerIndex(newState);
      break;

    case 'wild':
    case 'number':
    default:
      newState.currentPlayerIndex = getNextPlayerIndex(newState);
      break;
  }

  return newState;
}

export function playDiscardAll(state: GameState, playerId: string, cards: Card[]): GameState {
  if (cards.length === 0) {
    throw new Error('No cards to discard');
  }

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  const player = state.players[playerIndex];

  // Verify all cards are same color and match current color
  const color = cards[0].color;
  if (!cards.every(c => c.color === color)) {
    throw new Error('All cards must be same color for Discard All');
  }
  if (color !== state.currentColor) {
    throw new Error('Cards must match current color');
  }

  // Remove all matching cards from player's hand
  const cardIds = new Set(cards.map(c => c.id));
  const newCards = player.cards.filter(c => !cardIds.has(c.id));

  let newState: GameState = {
    ...state,
    discardPile: [...state.discardPile, ...cards],
    players: state.players.map((p, idx) =>
      idx === playerIndex ? { ...p, cards: newCards } : p
    ),
    currentPlayerIndex: getNextPlayerIndex(state),
    updatedAt: new Date().toISOString(),
  };

  // Check for winner
  if (newCards.length === 0) {
    newState = {
      ...newState,
      status: 'finished',
      winnerId: playerId,
    };
  }

  return newState;
}

export function processDrawPenalty(state: GameState): GameState {
  if (state.pendingDrawCount === 0) return state;

  const currentPlayer = state.players[state.currentPlayerIndex];
  let newState = drawCards(state, currentPlayer.id, state.pendingDrawCount);

  // Clear pending draw and move to next player
  newState = {
    ...newState,
    pendingDrawCount: 0,
    pendingDrawType: null,
    currentPlayerIndex: getNextPlayerIndex(newState),
  };

  return newState;
}

export function callUno(state: GameState, playerId: string): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) throw new Error('Player not found');

  const player = state.players[playerIndex];
  if (player.cards.length !== 1) {
    throw new Error('Can only call UNO with one card');
  }

  return {
    ...state,
    players: state.players.map((p, idx) =>
      idx === playerIndex ? { ...p, hasCalledUno: true } : p
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function challengeUno(state: GameState, challengerId: string, targetId: string): GameState {
  const targetIndex = state.players.findIndex(p => p.id === targetId);
  if (targetIndex === -1) throw new Error('Target player not found');

  const target = state.players[targetIndex];

  // Can only challenge if target has 1 card and hasn't called UNO
  if (target.cards.length !== 1 || target.hasCalledUno) {
    throw new Error('Cannot challenge this player');
  }

  // Target draws 4 cards as penalty
  return drawCards(state, targetId, 4);
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function getPlayableCards(state: GameState, playerId: string): Card[] {
  const player = state.players.find(p => p.id === playerId);
  if (!player) return [];

  return player.cards.filter(card => canPlayCard(state, card, playerId));
}

export function getCardsMatchingColor(cards: Card[], color: CardColor): Card[] {
  return cards.filter(c => c.color === color);
}

// Get all cards that can be stacked with a given card (same number)
export function getStackableCards(cards: Card[], card: Card): Card[] {
  if (card.type !== 'number') return [card];
  return cards.filter(c => c.type === 'number' && c.value === card.value);
}

// Check if multiple cards can be played at once (must all be same number)
export function canPlayMultipleCards(state: GameState, cards: Card[], playerId: string): boolean {
  if (cards.length === 0) return false;
  if (cards.length === 1) return canPlayCard(state, cards[0], playerId);

  // All cards must be number cards with the same value
  const firstCard = cards[0];
  if (firstCard.type !== 'number') return false;

  if (!cards.every(c => c.type === 'number' && c.value === firstCard.value)) {
    return false;
  }

  // At least one card must be playable normally
  return cards.some(c => canPlayCard(state, c, playerId));
}

// Play multiple cards at once (stacking)
export function playMultipleCards(state: GameState, playerId: string, cards: Card[]): GameState {
  if (!canPlayMultipleCards(state, cards, playerId)) {
    throw new Error('Cannot play these cards');
  }

  // Sort cards so the playable one is last (it determines the color)
  const sortedCards = [...cards].sort((a, b) => {
    const aPlayable = canPlayCard(state, a, playerId);
    const bPlayable = canPlayCard(state, b, playerId);
    if (aPlayable && !bPlayable) return 1;
    if (!aPlayable && bPlayable) return -1;
    return 0;
  });

  const playerIndex = state.players.findIndex(p => p.id === playerId);
  const player = state.players[playerIndex];

  // Remove all played cards from player's hand
  const cardIds = new Set(cards.map(c => c.id));
  const newCards = player.cards.filter(c => !cardIds.has(c.id));

  // The last card played determines the new color
  const lastCard = sortedCards[sortedCards.length - 1];

  let newState: GameState = {
    ...state,
    discardPile: [...state.discardPile, ...sortedCards],
    players: state.players.map((p, idx) =>
      idx === playerIndex ? { ...p, cards: newCards } : p
    ),
    currentColor: lastCard.color === 'wild' ? state.currentColor : lastCard.color,
    currentPlayerIndex: getNextPlayerIndex(state),
    updatedAt: new Date().toISOString(),
  };

  // Check for winner
  if (newCards.length === 0) {
    newState = {
      ...newState,
      status: 'finished',
      winnerId: playerId,
    };
  }

  return newState;
}
