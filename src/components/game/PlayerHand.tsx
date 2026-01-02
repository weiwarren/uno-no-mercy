'use client';

import { Card as CardType, CardColor } from '@/types/game';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';

interface PlayerHandProps {
  cards: CardType[];
  playableCards: CardType[];
  isMyTurn: boolean;
  onPlayCard: (card: CardType, selectedColor?: CardColor) => void;
  onPlayMultipleCards?: (cards: CardType[]) => void;
  onCallUno: () => void;
  hasCalledUno: boolean;
  className?: string;
}

export function PlayerHand({
  cards,
  playableCards,
  isMyTurn,
  onPlayCard,
  onPlayMultipleCards,
  onCallUno,
  hasCalledUno,
  className,
}: PlayerHandProps) {
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const playableCardIds = new Set(playableCards.map((c) => c.id));

  // Group number cards by value for stacking
  const stackableGroups = useMemo(() => {
    const groups = new Map<number, CardType[]>();
    cards.forEach(card => {
      if (card.type === 'number' && card.value !== undefined) {
        const existing = groups.get(card.value) || [];
        existing.push(card);
        groups.set(card.value, existing);
      }
    });
    // Only keep groups with multiple cards where at least one is playable
    const result = new Map<number, CardType[]>();
    groups.forEach((cardsInGroup, value) => {
      if (cardsInGroup.length > 1 && cardsInGroup.some(c => playableCardIds.has(c.id))) {
        result.set(value, cardsInGroup);
      }
    });
    return result;
  }, [cards, playableCardIds]);

  // Check if a card can be stacked with currently selected cards
  const canStackWith = (card: CardType): boolean => {
    if (selectedCards.length === 0) return false;
    const firstSelected = selectedCards[0];
    return (
      card.type === 'number' &&
      firstSelected.type === 'number' &&
      card.value === firstSelected.value
    );
  };

  const handleCardClick = (card: CardType) => {
    if (!isMyTurn) return;

    // If card is not playable and can't stack with selection, ignore
    if (!playableCardIds.has(card.id) && !canStackWith(card)) return;

    // Wild card - direct play with color picker
    if (card.color === 'wild') {
      setSelectedCards([card]);
      setShowColorPicker(true);
      return;
    }

    // Check if this is a stackable number card
    const isStackableNumber = card.type === 'number' && stackableGroups.has(card.value!);

    if (isStackableNumber) {
      // Toggle selection for stacking
      const isAlreadySelected = selectedCards.some(c => c.id === card.id);

      if (isAlreadySelected) {
        // Deselect
        setSelectedCards(prev => prev.filter(c => c.id !== card.id));
      } else if (selectedCards.length === 0) {
        // First selection
        setSelectedCards([card]);
      } else if (canStackWith(card)) {
        // Add to stack
        setSelectedCards(prev => [...prev, card]);
      } else {
        // Different number, start new selection
        setSelectedCards([card]);
      }
    } else {
      // Non-stackable card - play directly
      onPlayCard(card);
      setSelectedCards([]);
    }
  };

  const handlePlaySelected = () => {
    if (selectedCards.length === 0) return;

    if (selectedCards.length === 1) {
      onPlayCard(selectedCards[0]);
    } else if (onPlayMultipleCards) {
      onPlayMultipleCards(selectedCards);
    }
    setSelectedCards([]);
  };

  const handleColorSelect = (color: CardColor) => {
    if (selectedCards.length === 1 && selectedCards[0].color === 'wild') {
      onPlayCard(selectedCards[0], color);
      setSelectedCards([]);
      setShowColorPicker(false);
    }
  };

  // Sort cards by color then type
  const sortedCards = [...cards].sort((a, b) => {
    const colorOrder = ['red', 'blue', 'green', 'yellow', 'wild'];
    const colorDiff = colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color);
    if (colorDiff !== 0) return colorDiff;
    if (a.type === 'number' && b.type === 'number') {
      return (a.value || 0) - (b.value || 0);
    }
    return a.type.localeCompare(b.type);
  });

  // Calculate card overlap based on number of cards
  const getOverlap = () => {
    if (cards.length <= 7) return 'ml-0';
    if (cards.length <= 10) return '-ml-6';
    if (cards.length <= 15) return '-ml-8';
    return '-ml-10';
  };

  const selectedCardIds = new Set(selectedCards.map(c => c.id));

  return (
    <div className={cn('relative', className)}>
      {/* UNO button */}
      {cards.length === 2 && isMyTurn && !hasCalledUno && (
        <button
          onClick={onCallUno}
          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full text-xl animate-pulse shadow-lg z-30"
        >
          UNO!
        </button>
      )}

      {/* Play Selected button when multiple cards selected */}
      {selectedCards.length > 0 && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-2 z-30">
          <button
            onClick={handlePlaySelected}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full shadow-lg flex items-center gap-2"
          >
            Play {selectedCards.length > 1 ? `${selectedCards.length} Cards` : 'Card'}
          </button>
          <button
            onClick={() => setSelectedCards([])}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full shadow-lg"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Stacking hint */}
      {isMyTurn && stackableGroups.size > 0 && selectedCards.length === 0 && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-gray-400 text-xs z-20 bg-gray-800/80 px-3 py-1 rounded-full">
          Tip: Click same number cards to stack them!
        </div>
      )}

      {/* Cards - with extra top padding for hover pop-up effect */}
      <div className="flex justify-center items-end px-4 pt-8 pb-2">
        <div className="flex items-end">
          {sortedCards.map((card, index) => {
            const isPlayable = playableCardIds.has(card.id);
            const isSelected = selectedCardIds.has(card.id);
            const canStack = canStackWith(card);
            const isStackable = card.type === 'number' && stackableGroups.has(card.value!);

            return (
              <div
                key={card.id}
                className={cn(
                  'transition-all duration-200 hover:z-50',
                  index > 0 && getOverlap(),
                  isSelected && '-translate-y-4'
                )}
                style={{ zIndex: isSelected ? 100 + index : index }}
              >
                <Card
                  card={card}
                  isPlayable={isMyTurn && (isPlayable || canStack)}
                  isSelected={isSelected}
                  size="md"
                  onClick={() => handleCardClick(card)}
                  className={cn(
                    isStackable && !isSelected && isPlayable && 'ring-2 ring-purple-400 ring-offset-1 ring-offset-gray-900'
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Color picker modal */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-white text-xl font-bold text-center mb-4">Choose a Color</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['red', 'blue', 'green', 'yellow'] as CardColor[]).map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={cn(
                    'w-24 h-24 rounded-xl transition-all duration-200 transform hover:scale-110 shadow-lg font-bold text-white text-lg capitalize',
                    color === 'red' && 'bg-red-500 hover:bg-red-600',
                    color === 'blue' && 'bg-blue-500 hover:bg-blue-600',
                    color === 'green' && 'bg-green-500 hover:bg-green-600',
                    color === 'yellow' && 'bg-yellow-400 hover:bg-yellow-500 text-black'
                  )}
                >
                  {color}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowColorPicker(false);
                setSelectedCards([]);
              }}
              className="mt-4 w-full py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
