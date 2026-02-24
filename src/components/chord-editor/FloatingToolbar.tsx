
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Play, 
  Pause, 
  Plus, 
  Minus, 
  CornerDownLeft,
  Clock, 
  Music,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface FloatingToolbarProps {
  onAddBarHorizontal?: () => void;
  onAddBarVertical?: () => void;
  onRemoveBar?: () => void;
  onAddSection: () => void;
  onSave: () => void;
  canRemoveBar: boolean;
  isPlaying: boolean;
  currentTime: number;
  midiEnabled: boolean;
  hasUnsavedChanges: boolean;
}

const FloatingToolbar = ({
  onAddBarHorizontal,
  onAddBarVertical,
  onRemoveBar,
  onAddSection,
  onSave,
  canRemoveBar,
  isPlaying,
  currentTime,
  midiEnabled,
  hasUnsavedChanges
}: FloatingToolbarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed z-30 ${isMobile ? 'bottom-4 right-4' : 'bottom-6 right-6'}`}>
      <Card className={`p-3 shadow-lg transition-all duration-300 ${isExpanded ? 'w-auto' : 'w-auto'}`}>
        <div className="flex flex-col gap-2">
          {/* Primary Action Row */}
          <div className="flex items-center gap-2">
            {/* Status Indicators */}
            <div className="flex items-center gap-1">
              {isPlaying && (
                <Badge variant="default" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(currentTime)}
                </Badge>
              )}
              {midiEnabled ? (
                <Badge variant="secondary" className="text-xs">
                  <Wifi className="w-3 h-3 mr-1" />
                  MIDI
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <WifiOff className="w-3 h-3 mr-1" />
                  No MIDI
                </Badge>
              )}
            </div>

            {/* Expand/Collapse Button */}
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              size="sm"
              variant="outline"
              className="p-2"
            >
              <Music className="w-4 h-4" />
            </Button>

            {/* Save Button */}
            <Button
              onClick={onSave}
              size="sm"
              variant={hasUnsavedChanges ? "default" : "outline"}
              className="flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              {!isMobile && (hasUnsavedChanges ? 'Save*' : 'Saved')}
            </Button>
          </div>

          {/* Expanded Controls */}
          {isExpanded && (
            <div className="flex flex-col gap-2 border-t pt-2">
              {/* Bar Controls */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-2">Bars:</span>
                {onAddBarHorizontal && (
                  <Button
                    onClick={onAddBarHorizontal}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 text-xs"
                    title="Add bar horizontally"
                  >
                    <Plus className="w-3 h-3" />
                    {!isMobile && 'Add Bar'}
                  </Button>
                )}
                {onAddBarVertical && (
                  <Button
                    onClick={onAddBarVertical}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 text-xs"
                    title="Add new row (Enter Bar)"
                  >
                    <CornerDownLeft className="w-3 h-3" />
                    {!isMobile && 'Enter Bar'}
                  </Button>
                )}
                {canRemoveBar && onRemoveBar && (
                  <Button
                    onClick={onRemoveBar}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 text-xs hover:bg-destructive hover:text-destructive-foreground"
                    title="Remove bar"
                  >
                    <Minus className="w-3 h-3" />
                    {!isMobile && 'Remove'}
                  </Button>
                )}
              </div>

              {/* Section Controls */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-2">Section:</span>
                <Button
                  onClick={onAddSection}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  {!isMobile && 'Add Section'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default FloatingToolbar;
