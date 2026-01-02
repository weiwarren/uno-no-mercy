-- UNO No Mercy Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (simple user management without auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  game_state JSONB NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 4 CHECK (max_players >= 2 AND max_players <= 10),
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_games_room_code ON games(room_code);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_host ON games(host_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can read all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own record" ON users
  FOR INSERT WITH CHECK (true);

-- RLS Policies for games
CREATE POLICY "Anyone can read games" ON games
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create games" ON games
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update games" ON games
  FOR UPDATE USING (true);

CREATE POLICY "Host can delete their games" ON games
  FOR DELETE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for games table
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Clean up old games (run this periodically or as a cron job)
-- DELETE FROM games WHERE created_at < NOW() - INTERVAL '24 hours';
