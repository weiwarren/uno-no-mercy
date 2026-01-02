import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { DbGame, DbPlayer, GameState } from '@/types/game';

// Client-side Supabase client
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(supabaseUrl, supabaseKey);
}

// For server-side usage
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseKey);
}

// Singleton for client-side
let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClient should only be called on the client side');
  }

  if (!clientInstance) {
    clientInstance = createSupabaseClient();
  }

  return clientInstance;
}

// Database operations
export async function createGame(supabase: ReturnType<typeof createBrowserClient>, gameState: GameState, hostUserId: string) {
  const { data, error } = await supabase
    .from('games')
    .insert({
      id: gameState.id,
      room_code: gameState.roomCode,
      host_id: hostUserId,
      status: gameState.status,
      game_state: gameState,
      max_players: gameState.maxPlayers,
      is_private: gameState.isPrivate,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbGame;
}

export async function getGameByRoomCode(supabase: ReturnType<typeof createBrowserClient>, roomCode: string) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error) throw error;
  return data as DbGame;
}

export async function getGame(supabase: ReturnType<typeof createBrowserClient>, gameId: string) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error) throw error;
  return data as DbGame;
}

export async function updateGameState(supabase: ReturnType<typeof createBrowserClient>, gameId: string, gameState: GameState) {
  const { data, error } = await supabase
    .from('games')
    .update({
      status: gameState.status,
      game_state: gameState,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error) throw error;
  return data as DbGame;
}

export async function deleteGame(supabase: ReturnType<typeof createBrowserClient>, gameId: string) {
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId);

  if (error) throw error;
}

export async function listOpenGames(supabase: ReturnType<typeof createBrowserClient>) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'waiting')
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data as DbGame[];
}

// User operations
export async function createOrGetUser(supabase: ReturnType<typeof createBrowserClient>, sessionId: string, username: string) {
  // First try to get existing user by session ID
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // Create new user with the session ID
  // If username conflicts, append a random suffix
  let finalUsername = username;
  let attempts = 0;

  while (attempts < 5) {
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ id: sessionId, username: finalUsername })
      .select()
      .single();

    if (!error) {
      return newUser;
    }

    // If conflict (duplicate username), try with a suffix
    if (error.code === '23505') {
      attempts++;
      finalUsername = `${username}#${Math.random().toString(36).substring(2, 6)}`;
    } else {
      throw error;
    }
  }

  throw new Error('Failed to create user after multiple attempts');
}

// Real-time subscriptions
export function subscribeToGame(
  supabase: ReturnType<typeof createBrowserClient>,
  gameId: string,
  callback: (gameState: GameState) => void
) {
  return supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      },
      (payload: { new: Record<string, unknown> | null }) => {
        if (payload.new && 'game_state' in payload.new) {
          callback(payload.new.game_state as GameState);
        }
      }
    )
    .subscribe();
}

// Broadcast channel for real-time game actions (faster than DB updates)
export function createGameChannel(
  supabase: ReturnType<typeof createBrowserClient>,
  gameId: string
) {
  return supabase.channel(`game-actions:${gameId}`, {
    config: {
      broadcast: { self: true },
      presence: { key: '' },
    },
  });
}
