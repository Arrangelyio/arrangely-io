import { ChevronDown, Play } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export interface CountInOption {
  label: string;
  value: string; // 'none', '8bars', '4bars', '2bars', '1bar', '1/2', '1/2T', '1/4', '1/4T', '1/8', '1/8T', '1/16', '1/16T', '1/32'
  beats: number; // Number of beats for this count-in
  shortcut?: string;
}

interface CountInSelectorProps {
  value: string;
  onChange: (option: string) => void;
  onPlayWithCountIn?: () => void;
  disabled?: boolean;
  isPlaying?: boolean;
}

const COUNT_IN_OPTIONS: CountInOption[] = [
  { label: 'None', value: 'none', beats: 0, shortcut: 'Ctrl+0' },
  { label: '8 Bars', value: '8bars', beats: 32 },
  { label: '4 Bars', value: '4bars', beats: 16, shortcut: 'Ctrl+9' },
  { label: '2 Bars', value: '2bars', beats: 8 },
  { label: '1 Bar', value: '1bar', beats: 4, shortcut: 'Ctrl+8' },
  { label: '1/2', value: '1/2', beats: 2 },
  { label: '1/2T', value: '1/2T', beats: 1.33 },
  { label: '1/4', value: '1/4', beats: 1, shortcut: 'Ctrl+7' },
  { label: '1/4T', value: '1/4T', beats: 0.67 },
  { label: '1/8', value: '1/8', beats: 0.5 },
  { label: '1/8T', value: '1/8T', beats: 0.33 },
  { label: '1/16', value: '1/16', beats: 0.25, shortcut: 'Ctrl+6' },
  { label: '1/16T', value: '1/16T', beats: 0.17 },
  { label: '1/32', value: '1/32', beats: 0.125 },
];

export function getCountInBeats(value: string): number {
  const option = COUNT_IN_OPTIONS.find(opt => opt.value === value);
  return option?.beats ?? 0;
}

export function getCountInLabel(value: string): string {
  const option = COUNT_IN_OPTIONS.find(opt => opt.value === value);
  return option?.label ?? 'None';
}

export default function CountInSelector({ 
  value, 
  onChange, 
  onPlayWithCountIn,
  disabled = false,
  isPlaying = false 
}: CountInSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = COUNT_IN_OPTIONS.find(opt => opt.value === value) || COUNT_IN_OPTIONS[0];

  const handlePlayClick = () => {
    if (onPlayWithCountIn && !disabled && !isPlaying && value !== 'none') {
      onPlayWithCountIn();
    }
  };

  return (
    <div className="flex items-center gap-1" ref={dropdownRef}>
      {/* Count-in selector dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-l text-sm font-medium transition-colors"
        >
          <span className="text-muted-foreground text-xs">Count-in:</span>
          <span>{selectedOption.label}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-44 bg-[hsl(0,0%,18%)] border border-[hsl(0,0%,28%)] rounded-lg shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
            {COUNT_IN_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                  value === option.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-[hsl(0,0%,85%)] hover:bg-[hsl(0,0%,25%)]'
                }`}
              >
                <span>{option.label}</span>
                {option.shortcut && (
                  <span className={`text-xs ${value === option.value ? 'text-primary-foreground/70' : 'text-[hsl(0,0%,55%)]'}`}>
                    {option.shortcut}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Play with count-in button */}
      <button
        onClick={handlePlayClick}
        disabled={disabled || isPlaying || value === 'none'}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground border border-primary rounded-r text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={value !== 'none' ? `Play with ${selectedOption.label} count-in` : 'Select count-in first'}
      >
        <Play className="w-3.5 h-3.5" />
        <span>Start</span>
      </button>
    </div>
  );
}
