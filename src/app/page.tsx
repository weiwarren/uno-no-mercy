'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { LoginForm } from '@/components/lobby/LoginForm';
import { GameLobby } from '@/components/lobby/GameLobby';

export default function Home() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn, logout } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleCreateGame = (isSinglePlayer: boolean) => {
    if (isSinglePlayer) {
      router.push('/game?mode=single');
    } else {
      router.push('/game?mode=host');
    }
  };

  const handleJoinGame = (roomCode: string) => {
    router.push(`/game?mode=join&room=${roomCode}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      {!isLoggedIn ? (
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 mb-2">
              UNO
            </h1>
            <h2 className="text-2xl font-bold text-white">NO MERCY</h2>
            <p className="text-gray-400 mt-2">The ruthless card game</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
            <LoginForm />
          </div>
        </div>
      ) : (
        <GameLobby
          username={user!.username}
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          onLogout={logout}
        />
      )}
    </main>
  );
}
