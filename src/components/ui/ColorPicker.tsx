'use client';

import { CardColor } from '@/types/game';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  onSelect: (color: CardColor) => void;
  className?: string;
}

const colors: { color: CardColor; bg: string; label: string }[] = [
  { color: 'red', bg: 'bg-red-500 hover:bg-red-600', label: 'Red' },
  { color: 'blue', bg: 'bg-blue-500 hover:bg-blue-600', label: 'Blue' },
  { color: 'green', bg: 'bg-green-500 hover:bg-green-600', label: 'Green' },
  { color: 'yellow', bg: 'bg-yellow-400 hover:bg-yellow-500', label: 'Yellow' },
];

export function ColorPicker({ onSelect, className }: ColorPickerProps) {
  return (
    <div className={cn('fixed inset-0 bg-black/70 flex items-center justify-center z-50', className)}>
      <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-white text-xl font-bold text-center mb-4">Choose a Color</h3>
        <div className="grid grid-cols-2 gap-4">
          {colors.map(({ color, bg, label }) => (
            <button
              key={color}
              onClick={() => onSelect(color)}
              className={cn(
                'w-24 h-24 rounded-xl transition-all duration-200 transform hover:scale-110 shadow-lg',
                bg
              )}
            >
              <span className="text-white font-bold text-lg drop-shadow-lg">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
