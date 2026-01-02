'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface GameLobbyProps {
  username: string;
  onCreateGame: (isSinglePlayer: boolean) => void;
  onJoinGame: (roomCode: string) => void;
  onLogout: () => void;
}

export function GameLobby({ username, onCreateGame, onJoinGame, onLogout }: GameLobbyProps) {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'play' | 'join'>('play');

  const handleJoinGame = () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    if (roomCode.length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }
    onJoinGame(roomCode.toUpperCase());
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 mb-2">
          UNO NO MERCY
        </h1>
        <p className="text-gray-400">Welcome, <span className="text-white font-semibold">{username}</span>!</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('play')}
          className={cn(
            'flex-1 py-2 px-4 rounded-md font-semibold transition-all',
            activeTab === 'play'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          )}
        >
          Play
        </button>
        <button
          onClick={() => setActiveTab('join')}
          className={cn(
            'flex-1 py-2 px-4 rounded-md font-semibold transition-all',
            activeTab === 'join'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          )}
        >
          Join Game
        </button>
      </div>

      {/* Tab content */}
      <div className="space-y-4">
        {activeTab === 'play' && (
          <>
            {/* Single Player */}
            <button
              onClick={() => onCreateGame(true)}
              className="w-full p-6 bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl text-left hover:from-purple-500 hover:to-purple-700 transition-all transform hover:scale-[1.02] shadow-lg"
            >
              <h3 className="text-xl font-bold text-white mb-1">Single Player</h3>
              <p className="text-purple-200 text-sm">Play against AI opponents</p>
            </button>

            {/* Multiplayer */}
            <button
              onClick={() => onCreateGame(false)}
              className="w-full p-6 bg-gradient-to-r from-green-600 to-green-800 rounded-xl text-left hover:from-green-500 hover:to-green-700 transition-all transform hover:scale-[1.02] shadow-lg"
            >
              <h3 className="text-xl font-bold text-white mb-1">Create Room</h3>
              <p className="text-green-200 text-sm">Host a game for friends to join</p>
            </button>
          </>
        )}

        {activeTab === 'join' && (
          <div className="space-y-4">
            <Input
              label="Room Code"
              placeholder="Enter 6-letter code..."
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setError('');
              }}
              error={error}
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono uppercase"
            />
            <Button
              onClick={handleJoinGame}
              className="w-full"
              size="lg"
              variant="success"
            >
              Join Game
            </Button>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="text-center">
        <button
          onClick={onLogout}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          Change username
        </button>
      </div>
    </div>
  );
}
