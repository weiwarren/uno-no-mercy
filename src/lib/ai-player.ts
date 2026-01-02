import { GameState, Card, CardColor, Player, CardType } from '@/types/game';
import { getPlayableCards } from './game-logic';

// AI Difficulty levels
export type AIDifficulty = 'easy' | 'medium' | 'hard';

// AI decision making
export interface AIDecision {
  action: 'play' | 'draw' | 'call_uno';
  card?: Card;
  cards?: Card[]; // For discard all
  selectedColor?: CardColor;
}

export function makeAIDecision(
  state: GameState,
  playerId: string,
  difficulty: AIDifficulty = 'medium'
): AIDecision {
  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    return { action: 'draw' };
  }

  const playableCards = getPlayableCards(state, playerId);

  // If no playable cards, must draw
  if (playableCards.length === 0) {
    return { action: 'draw' };
  }

  // Check if we should call UNO
  if (player.cards.length === 2 && playableCards.length > 0) {
    // Will have 1 card after playing, should call UNO
    const decision = selectCardToPlay(state, player, playableCards, difficulty);
    return {
      ...decision,
      action: 'call_uno',
    };
  }

  return selectCardToPlay(state, player, playableCards, difficulty);
}

function selectCardToPlay(
  state: GameState,
  player: Player,
  playableCards: Card[],
  difficulty: AIDifficulty
): AIDecision {
  // Check for discard all opportunity first
  const discardAllCards = playableCards.filter(c => c.type === 'discard_all');
  if (discardAllCards.length > 0 && difficulty !== 'easy') {
    const color = state.currentColor;
    const matchingCards = player.cards.filter(c => c.color === color);
    if (matchingCards.length >= 3) {
      // Good opportunity to use discard all
      return {
        action: 'play',
        card: discardAllCards[0],
        cards: matchingCards,
        selectedColor: color,
      };
    }
  }

  let selectedCard: Card;

  switch (difficulty) {
    case 'easy':
      // Random selection
      selectedCard = playableCards[Math.floor(Math.random() * playableCards.length)];
      break;

    case 'medium':
      // Prefer action cards over number cards
      selectedCard = selectMediumDifficulty(playableCards, state);
      break;

    case 'hard':
      // Strategic selection
      selectedCard = selectHardDifficulty(playableCards, state, player);
      break;

    default:
      selectedCard = playableCards[0];
  }

  // Select color for wild cards
  let selectedColor: CardColor | undefined;
  if (selectedCard.color === 'wild') {
    selectedColor = selectBestColor(player.cards);
  }

  return {
    action: 'play',
    card: selectedCard,
    selectedColor,
  };
}

function selectMediumDifficulty(playableCards: Card[], state: GameState): Card {
  // Priority order for medium AI:
  // 1. Draw cards if opponent has few cards
  // 2. Skip/Reverse cards
  // 3. Number cards
  // 4. Wild cards (save for later)

  const nextPlayer = getNextPlayer(state);
  const shouldBeAggressive = nextPlayer && nextPlayer.cards.length <= 3;

  if (shouldBeAggressive) {
    // Play draw cards aggressively
    const drawCards = playableCards.filter(c => isDrawCard(c.type));
    if (drawCards.length > 0) {
      return drawCards.sort((a, b) => getDrawCount(b.type) - getDrawCount(a.type))[0];
    }

    // Play skip/reverse
    const skipReverse = playableCards.filter(c =>
      ['skip', 'reverse', 'skip_everyone', 'reverse_everyone'].includes(c.type)
    );
    if (skipReverse.length > 0) {
      return skipReverse[0];
    }
  }

  // Prefer non-wild cards
  const nonWildCards = playableCards.filter(c => c.color !== 'wild');
  if (nonWildCards.length > 0) {
    // Play highest value number card or action card
    return nonWildCards.sort((a, b) => getCardPriority(b) - getCardPriority(a))[0];
  }

  return playableCards[0];
}

function selectHardDifficulty(playableCards: Card[], state: GameState, player: Player): Card {
  // Hard AI considers:
  // 1. What cards are likely in opponents' hands
  // 2. Card counting (cards already played)
  // 3. Strategic wild card usage
  // 4. Blocking potential UNO calls

  const nextPlayer = getNextPlayer(state);

  // If next player has 1-2 cards, play most disruptive card
  if (nextPlayer && nextPlayer.cards.length <= 2) {
    // Play draw cards
    const drawCards = playableCards.filter(c => isDrawCard(c.type));
    if (drawCards.length > 0) {
      return drawCards.sort((a, b) => getDrawCount(b.type) - getDrawCount(a.type))[0];
    }

    // Play skip
    const skips = playableCards.filter(c =>
      ['skip', 'skip_everyone'].includes(c.type)
    );
    if (skips.length > 0) {
      return skips[0];
    }
  }

  // Count colors in hand to determine best plays
  const colorCounts = countColors(player.cards);
  const dominantColor = Object.entries(colorCounts)
    .filter(([color]) => color !== 'wild')
    .sort(([, a], [, b]) => b - a)[0]?.[0] as CardColor | undefined;

  // Play cards that match our dominant color
  if (dominantColor) {
    const dominantColorCards = playableCards.filter(c => c.color === dominantColor);
    if (dominantColorCards.length > 0) {
      // Among these, prefer higher value/action cards
      return dominantColorCards.sort((a, b) => getCardPriority(b) - getCardPriority(a))[0];
    }
  }

  // Save wild cards if possible
  const nonWildCards = playableCards.filter(c => c.color !== 'wild');
  if (nonWildCards.length > 0) {
    return nonWildCards.sort((a, b) => getCardPriority(b) - getCardPriority(a))[0];
  }

  // Must play wild
  const wilds = playableCards.filter(c => c.color === 'wild');
  // Prefer regular wild over draw wilds (save for blocking)
  const regularWilds = wilds.filter(c => c.type === 'wild');
  if (regularWilds.length > 0) {
    return regularWilds[0];
  }

  return playableCards[0];
}

function getNextPlayer(state: GameState): Player | undefined {
  const numPlayers = state.players.length;
  const nextIndex = (state.currentPlayerIndex + state.direction + numPlayers) % numPlayers;
  return state.players[nextIndex];
}

function isDrawCard(type: CardType): boolean {
  return ['draw2', 'draw4', 'draw6', 'draw10', 'wild_draw2', 'wild_draw4', 'wild_draw_color'].includes(type);
}

function getDrawCount(type: CardType): number {
  const counts: Record<string, number> = {
    'draw2': 2,
    'wild_draw2': 2,
    'draw4': 4,
    'wild_draw4': 4,
    'draw6': 6,
    'wild_draw_color': 4,
    'draw10': 10,
  };
  return counts[type] || 0;
}

function getCardPriority(card: Card): number {
  // Higher priority = play first
  const typePriority: Record<CardType, number> = {
    'draw10': 100,
    'draw6': 90,
    'wild_draw4': 85,
    'draw4': 80,
    'wild_draw_color': 75,
    'wild_draw2': 70,
    'draw2': 65,
    'skip_everyone': 60,
    'skip': 55,
    'reverse_everyone': 50,
    'reverse': 45,
    'discard_all': 40,
    'color_roulette': 35,
    'number': 30,
    'wild': 20, // Save wilds for later
  };

  let priority = typePriority[card.type] || 0;

  // For number cards, higher value = higher priority
  if (card.type === 'number' && card.value !== undefined) {
    priority += card.value;
  }

  return priority;
}

function countColors(cards: Card[]): Record<CardColor, number> {
  const counts: Record<CardColor, number> = {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
    wild: 0,
  };

  for (const card of cards) {
    counts[card.color]++;
  }

  return counts;
}

export function selectBestColor(cards: Card[]): CardColor {
  const counts = countColors(cards);

  // Find color with most cards (excluding wild)
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  let bestColor = colors[0];
  let maxCount = 0;

  for (const color of colors) {
    if (counts[color] > maxCount) {
      maxCount = counts[color];
      bestColor = color;
    }
  }

  // If no colored cards, pick random
  if (maxCount === 0) {
    return colors[Math.floor(Math.random() * colors.length)];
  }

  return bestColor;
}

// Delay for AI actions to make it feel more natural
export function getAIDelay(difficulty: AIDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 1500 + Math.random() * 500;
    case 'medium':
      return 1000 + Math.random() * 1000;
    case 'hard':
      return 500 + Math.random() * 1500;
    default:
      return 1000;
  }
}
