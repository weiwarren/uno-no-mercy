'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<unknown>;
  onRegister: (email: string, password: string, username: string) => Promise<unknown>;
}

export function LoginForm({ onLogin, onRegister }: LoginFormProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (isRegistering) {
      if (!username.trim()) {
        setError('Please enter a username');
        return;
      }

      if (username.length < 2) {
        setError('Username must be at least 2 characters');
        return;
      }

      if (username.length > 20) {
        setError('Username must be 20 characters or less');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isRegistering) {
        await onRegister(email.trim(), password, username.trim());
      } else {
        await onLogin(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setIsRegistering(false);
            setError('');
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
            !isRegistering
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegistering(true);
            setError('');
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
            isRegistering
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegistering && (
          <Input
            label="Username"
            placeholder="Choose a display name..."
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            maxLength={20}
            autoComplete="username"
          />
        )}

        <Input
          label="Email"
          type="email"
          placeholder="Enter your email..."
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          autoComplete="email"
          autoFocus={!isRegistering}
        />

        <Input
          label="Password"
          type="password"
          placeholder={isRegistering ? 'Create a password (min 6 chars)...' : 'Enter your password...'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          autoComplete={isRegistering ? 'new-password' : 'current-password'}
        />

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              {isRegistering ? 'Creating account...' : 'Signing in...'}
            </span>
          ) : (
            isRegistering ? 'Create Account' : 'Sign In'
          )}
        </Button>
      </form>

      <p className="text-center text-gray-500 text-sm">
        {isRegistering
          ? 'Already have an account? '
          : "Don't have an account? "}
        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError('');
          }}
          className="text-blue-400 hover:text-blue-300 underline"
        >
          {isRegistering ? 'Sign in' : 'Register'}
        </button>
      </p>
    </div>
  );
}
