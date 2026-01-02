'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { GameState, Card as CardType } from '@/types/game';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface AnimatedCard {
  id: string;
  card: CardType;
  type: 'play' | 'draw' | 'deal';
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  startTime: number;
  duration: number;
  rotation: number;
  arcHeight: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  life: number;
  maxLife: number;
}

interface GameAnimationsProps {
  gameState: GameState;
  currentPlayerId: string;
  discardPileRef: React.RefObject<HTMLDivElement | null>;
  drawPileRef: React.RefObject<HTMLDivElement | null>;
  playerHandRef: React.RefObject<HTMLDivElement | null>;
}

export function GameAnimations({
  gameState,
  currentPlayerId,
  discardPileRef,
  drawPileRef,
  playerHandRef,
}: GameAnimationsProps) {
  const [animatedCards, setAnimatedCards] = useState<AnimatedCard[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevStateRef = useRef<GameState | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const cardAnimFrameRef = useRef<number | undefined>(undefined);

  // Spawn particles at a position
  const spawnParticles = useCallback((x: number, y: number, color: string, count: number = 16) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 3 + Math.random() * 6;
      newParticles.push({
        id: `${Date.now()}-${i}`,
        x,
        y,
        color,
        size: 6 + Math.random() * 8,
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        life: 1,
        maxLife: 1,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // Get color for card
  const getCardColor = (card: CardType): string => {
    switch (card.color) {
      case 'red': return '#ef4444';
      case 'blue': return '#3b82f6';
      case 'green': return '#22c55e';
      case 'yellow': return '#eab308';
      default: return '#a855f7';
    }
  };

  // Animate card from one position to another
  const animateCard = useCallback((
    card: CardType,
    type: 'play' | 'draw' | 'deal',
    startRef: React.RefObject<HTMLDivElement | null>,
    endRef: React.RefObject<HTMLDivElement | null>,
  ) => {
    const startEl = startRef.current;
    const endEl = endRef.current;
    if (!startEl || !endEl) return;

    const startRect = startEl.getBoundingClientRect();
    const endRect = endEl.getBoundingClientRect();

    // Random rotation for realistic throw effect
    const randomRotation = (Math.random() - 0.5) * 720; // -360 to 360 degrees

    const animated: AnimatedCard = {
      id: `${card.id}-${Date.now()}`,
      card,
      type,
      startPos: {
        x: startRect.left + startRect.width / 2,
        y: startRect.top + startRect.height / 2,
      },
      endPos: {
        x: endRect.left + endRect.width / 2,
        y: endRect.top + endRect.height / 2,
      },
      startTime: Date.now(),
      duration: type === 'play' ? 500 : 400, // Longer duration for play
      rotation: randomRotation,
      arcHeight: type === 'play' ? 150 : 80, // Higher arc for throwing
    };

    setAnimatedCards(prev => [...prev, animated]);

    // Spawn particles at end position after animation
    setTimeout(() => {
      spawnParticles(animated.endPos.x, animated.endPos.y, getCardColor(card), 20);
      setAnimatedCards(prev => prev.filter(a => a.id !== animated.id));
    }, animated.duration);
  }, [spawnParticles]);

  // Watch for game state changes and trigger animations
  useEffect(() => {
    const prevState = prevStateRef.current;

    if (!prevState) {
      prevStateRef.current = gameState;
      return;
    }

    // Card was played (discard pile grew)
    if (gameState.discardPile.length > prevState.discardPile.length) {
      const playedCard = gameState.discardPile[gameState.discardPile.length - 1];

      // Determine who played (check previous player)
      const prevPlayerIndex = prevState.currentPlayerIndex;
      const prevPlayer = prevState.players[prevPlayerIndex];

      if (prevPlayer.id === currentPlayerId && playerHandRef.current && discardPileRef.current) {
        // Current player played - animate from hand to discard
        animateCard(playedCard, 'play', playerHandRef, discardPileRef);
      } else if (discardPileRef.current) {
        // Opponent played - just show particles at discard pile
        const rect = discardPileRef.current.getBoundingClientRect();
        spawnParticles(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          getCardColor(playedCard),
          8
        );
      }
    }

    // Cards were drawn (check if current player's hand grew)
    const myPlayer = gameState.players.find(p => p.id === currentPlayerId);
    const prevMyPlayer = prevState.players.find(p => p.id === currentPlayerId);

    if (myPlayer && prevMyPlayer && myPlayer.cards.length > prevMyPlayer.cards.length) {
      const drawnCount = myPlayer.cards.length - prevMyPlayer.cards.length;

      // Animate each drawn card
      for (let i = 0; i < Math.min(drawnCount, 5); i++) {
        const cardIndex = prevMyPlayer.cards.length + i;
        if (cardIndex < myPlayer.cards.length && drawPileRef.current && playerHandRef.current) {
          setTimeout(() => {
            animateCard(myPlayer.cards[cardIndex], 'draw', drawPileRef, playerHandRef);
          }, i * 100);
        }
      }
    }

    prevStateRef.current = gameState;
  }, [gameState, currentPlayerId, animateCard, spawnParticles, discardPileRef, drawPileRef, playerHandRef]);

  // Animation frame for smooth card and particle updates
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    let running = true;

    const animate = () => {
      if (!running) return;

      // Update particles
      setParticles(prev => {
        const updated = prev
          .map(p => ({
            ...p,
            x: p.x + p.velocity.x,
            y: p.y + p.velocity.y,
            velocity: {
              x: p.velocity.x * 0.95,
              y: p.velocity.y * 0.95 + 0.2, // gravity
            },
            life: p.life - 0.03,
          }))
          .filter(p => p.life > 0);

        return updated;
      });

      // Force re-render to update card positions
      if (animatedCards.length > 0) {
        forceUpdate(n => n + 1);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (particles.length > 0 || animatedCards.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particles.length > 0, animatedCards.length > 0]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Animated cards with motion trail */}
      {animatedCards.map(anim => {
        const progress = Math.min(1, (Date.now() - anim.startTime) / anim.duration);

        // Calculate position along arc
        const calcPosition = (p: number) => {
          const easedP = 1 - Math.pow(1 - p, 3);
          const px = anim.startPos.x + (anim.endPos.x - anim.startPos.x) * easedP;
          const linearY = anim.startPos.y + (anim.endPos.y - anim.startPos.y) * easedP;
          const arcOffset = Math.sin(p * Math.PI) * anim.arcHeight;
          return { x: px, y: linearY - arcOffset };
        };

        const pos = calcPosition(progress);

        // Scale up during flight, then back to normal
        const scale = 1 + Math.sin(progress * Math.PI) * 0.4;

        // Use the random rotation stored in the animation
        const rotation = progress * anim.rotation;

        // Shadow/glow intensity based on height
        const shadowIntensity = Math.sin(progress * Math.PI);
        const glowColor = getCardColor(anim.card);

        // Generate trail positions (5 ghost cards behind)
        const trailCount = 5;
        const trails = [];
        for (let i = 1; i <= trailCount; i++) {
          const trailProgress = Math.max(0, progress - i * 0.06);
          if (trailProgress > 0) {
            const trailPos = calcPosition(trailProgress);
            const trailRotation = trailProgress * anim.rotation;
            const trailOpacity = (1 - i / trailCount) * 0.4;
            const trailScale = 1 + Math.sin(trailProgress * Math.PI) * 0.4 - i * 0.05;
            trails.push({ ...trailPos, rotation: trailRotation, opacity: trailOpacity, scale: trailScale, index: i });
          }
        }

        return (
          <div key={anim.id}>
            {/* Motion trail - ghost cards */}
            {trails.map(trail => (
              <div
                key={`trail-${trail.index}`}
                className="absolute transition-none pointer-events-none"
                style={{
                  left: trail.x,
                  top: trail.y,
                  transform: `translate(-50%, -50%) scale(${trail.scale}) rotate(${trail.rotation}deg)`,
                  opacity: trail.opacity,
                  filter: `blur(${trail.index}px)`,
                  zIndex: 99 - trail.index,
                }}
              >
                <Card card={anim.card} size="lg" />
              </div>
            ))}

            {/* Main flying card */}
            <div
              className="absolute transition-none"
              style={{
                left: pos.x,
                top: pos.y,
                transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
                filter: `drop-shadow(0 ${10 + shadowIntensity * 30}px ${15 + shadowIntensity * 20}px rgba(0,0,0,0.5)) drop-shadow(0 0 ${shadowIntensity * 20}px ${glowColor})`,
                zIndex: 100,
              }}
            >
              <Card card={anim.card} size="lg" />
            </div>
          </div>
        );
      })}

      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: p.life,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}
