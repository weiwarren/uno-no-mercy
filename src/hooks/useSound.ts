'use client';

import { useCallback, useRef, useEffect } from 'react';

type SoundType =
  | 'playCard'
  | 'drawCard'
  | 'yourTurn'
  | 'uno'
  | 'skip'
  | 'reverse'
  | 'drawPenalty'
  | 'win'
  | 'lose'
  | 'click'
  | 'error';

export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  useEffect(() => {
    // Initialize AudioContext on first user interaction
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
    if (!enabledRef.current) return;

    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, []);

  const playSound = useCallback((sound: SoundType) => {
    if (!enabledRef.current) return;

    const ctx = audioContextRef.current;
    if (!ctx) {
      // Try to create context if not exists
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    switch (sound) {
      case 'playCard':
        // Quick satisfying "card slap" sound
        playTone(200, 0.1, 'square', 0.2);
        setTimeout(() => playTone(400, 0.05, 'square', 0.15), 30);
        break;

      case 'drawCard':
        // Soft shuffle sound
        playTone(150, 0.08, 'triangle', 0.2);
        setTimeout(() => playTone(180, 0.08, 'triangle', 0.15), 50);
        break;

      case 'yourTurn':
        // Attention-getting ascending tone
        playTone(440, 0.15, 'sine', 0.25);
        setTimeout(() => playTone(550, 0.15, 'sine', 0.25), 150);
        setTimeout(() => playTone(660, 0.2, 'sine', 0.3), 300);
        break;

      case 'uno':
        // Exciting UNO call
        playTone(523, 0.15, 'square', 0.3);
        setTimeout(() => playTone(659, 0.15, 'square', 0.3), 100);
        setTimeout(() => playTone(784, 0.3, 'square', 0.35), 200);
        break;

      case 'skip':
        // Descending "whoosh"
        playTone(600, 0.15, 'sawtooth', 0.15);
        setTimeout(() => playTone(400, 0.15, 'sawtooth', 0.1), 100);
        break;

      case 'reverse':
        // Swooping reverse sound
        playTone(400, 0.1, 'triangle', 0.2);
        setTimeout(() => playTone(500, 0.1, 'triangle', 0.2), 80);
        setTimeout(() => playTone(400, 0.1, 'triangle', 0.2), 160);
        break;

      case 'drawPenalty':
        // Ominous penalty sound
        playTone(200, 0.2, 'sawtooth', 0.25);
        setTimeout(() => playTone(150, 0.3, 'sawtooth', 0.2), 200);
        break;

      case 'win':
        // Victory fanfare
        [523, 659, 784, 1047].forEach((freq, i) => {
          setTimeout(() => playTone(freq, 0.3, 'sine', 0.3), i * 150);
        });
        break;

      case 'lose':
        // Sad trombone
        [400, 380, 360, 200].forEach((freq, i) => {
          setTimeout(() => playTone(freq, 0.3, 'sine', 0.25), i * 200);
        });
        break;

      case 'click':
        // Simple UI click
        playTone(800, 0.05, 'sine', 0.15);
        break;

      case 'error':
        // Error buzz
        playTone(200, 0.15, 'square', 0.2);
        setTimeout(() => playTone(180, 0.15, 'square', 0.2), 150);
        break;
    }
  }, [playTone]);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  return { playSound, setEnabled, isEnabled: () => enabledRef.current };
}
