// UNO No Mercy Card Types and Game State

export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';

export type CardType =
  | 'number'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'draw4'
  | 'draw6'
  | 'draw10'
  | 'wild'
  | 'wild_draw2'
  | 'wild_draw4'
  | 'wild_draw_color'
  | 'skip_everyone'
  | 'reverse_everyone'
  | 'discard_all'
  | 'color_roulette';

export interface Card {
  id: string;
  type: CardType;
  color: CardColor;
  value?: number; // 0-9 for number cards
}

export interface Player {
  id: string;
  name: string;
  cards: Card[];
  isAI: boolean;
  isHost: boolean;
  isConnected: boolean;
  hasCalledUno: boolean;
}

export type GameStatus = 'waiting' | 'playing' | 'finished';
export type Direction = 1 | -1;

export interface GameState {
  id: string;
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  direction: Direction;
  drawPile: Card[];
  discardPile: Card[];
  currentColor: CardColor;
  pendingDrawCount: number; // For stacking draw cards
  pendingDrawType: CardType | null; // Track what type of draw card is pending
  winnerId: string | null;
  createdAt: string;
  updatedAt: string;
  hostId: string;
  roomCode: string;
  maxPlayers: number;
  isPrivate: boolean;
}

export interface GameAction {
  type: 'play_card' | 'draw_card' | 'call_uno' | 'challenge_uno' | 'select_color' | 'pass';
  playerId: string;
  card?: Card;
  cards?: Card[]; // For discard_all
  selectedColor?: CardColor;
  targetPlayerId?: string; // For challenging UNO
}

export interface GameMessage {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: string;
}

// Database types for Supabase
export interface DbGame {
  id: string;
  room_code: string;
  host_id: string;
  status: GameStatus;
  game_state: GameState;
  max_players: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbPlayer {
  id: string;
  user_id: string;
  game_id: string;
  name: string;
  is_host: boolean;
  is_ai: boolean;
  is_connected: boolean;
  joined_at: string;
}

export interface DbUser {
  id: string;
  username: string;
  created_at: string;
}
