import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HitNotesGridProps {
  timeSignature: string;
  hits?: {
    subdivision: "1/4" | "1/8" | "1/16";
    markers: boolean[];
  };
  onHitsChange: (hits: { subdivision: "1/4" | "1/8" | "1/16"; markers: boolean[] }) => void;
  compact?: boolean;
}

const HitNotesGrid: React.FC<HitNotesGridProps> = ({ 
  timeSignature, 
  hits = { subdivision: "1/4", markers: [] }, 
  onHitsChange, 
  compact = false 
}) => {
  const beatsPerBar = parseInt(timeSignature.split('/')[0]) || 4;
  
  // Calculate subdivisions based on selected note value
  const getSubdivisions = (subdivision: "1/4" | "1/8" | "1/16") => {
    const multiplier = subdivision === "1/4" ? 1 : subdivision === "1/8" ? 2 : 4;
    return beatsPerBar * multiplier;
  };

  const totalSubdivisions = getSubdivisions(hits.subdivision);
  
  // Ensure markers array has correct length
  const ensureCorrectLength = (markers: boolean[]) => {
    const corrected = [...markers];
    while (corrected.length < totalSubdivisions) {
      corrected.push(false);
    }
    return corrected.slice(0, totalSubdivisions);
  };

  const currentMarkers = ensureCorrectLength(hits.markers);

  const toggleHit = (index: number) => {
    const newMarkers = [...currentMarkers];
    newMarkers[index] = !newMarkers[index];
    onHitsChange({
      ...hits,
      markers: newMarkers
    });
  };

  const changeSubdivision = (subdivision: "1/4" | "1/8" | "1/16") => {
    const newSubdivisions = getSubdivisions(subdivision);
    const newMarkers = Array(newSubdivisions).fill(false);
    
    // Try to preserve existing hits by mapping them to new subdivision
    if (hits.markers.length > 0) {
      const ratio = newSubdivisions / hits.markers.length;
      hits.markers.forEach((hit, index) => {
        if (hit) {
          const newIndex = Math.floor(index * ratio);
          if (newIndex < newSubdivisions) {
            newMarkers[newIndex] = true;
          }
        }
      });
    }
    
    onHitsChange({
      subdivision,
      markers: newMarkers
    });
  };

  const clearAll = () => {
    onHitsChange({
      ...hits,
      markers: Array(totalSubdivisions).fill(false)
    });
  };

  const getPositionLabel = (index: number) => {
    const beat = Math.floor(index / (totalSubdivisions / beatsPerBar)) + 1;
    const subdivision = index % (totalSubdivisions / beatsPerBar);
    
    if (hits.subdivision === "1/4") {
      return beat.toString();
    } else if (hits.subdivision === "1/8") {
      return subdivision === 0 ? beat.toString() : `${beat}+`;
    } else {
      const subLabels = ['', 'e', '+', 'a'];
      return subdivision === 0 ? beat.toString() : `${beat}${subLabels[subdivision] || ''}`;
    }
  };

  return (
    <div className={`space-y-2 ${compact ? 'text-xs' : ''}`}>
      {/* Subdivision Controls */}
      <div className="flex items-center gap-2">
        <span className={`font-medium text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
          HIT:
        </span>
        <Select value={hits.subdivision} onValueChange={changeSubdivision}>
          <SelectTrigger className={compact ? "h-6 text-xs px-2" : "w-20 h-8"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1/4">1/4</SelectItem>
            <SelectItem value="1/8">1/8</SelectItem>
            <SelectItem value="1/16">1/16</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearAll}
          className={compact ? "h-6 px-2 text-xs" : "h-8"}
        >
          Clear
        </Button>
      </div>

      {/* Hit Grid */}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(totalSubdivisions, compact ? 8 : 16)}, 1fr)` }}>
        {currentMarkers.map((isHit, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            {/* Position Label */}
            <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground font-mono`}>
              {getPositionLabel(index)}
            </span>
            
            {/* Hit Button */}
            <Button
              variant={isHit ? "default" : "outline"}
              size="sm"
              className={`
                ${compact ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'} 
                transition-all duration-150 relative
                ${isHit ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent'}
              `}
              onClick={() => toggleHit(index)}
            >
              {isHit && (
                <span className={`${compact ? 'text-xs' : 'text-sm'} font-bold`}>
                  ●
                </span>
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* Active Hits Display */}
      {currentMarkers.some(hit => hit) && (
        <div className="flex flex-wrap gap-1 mt-2">
          <span className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
            Active:
          </span>
          {currentMarkers.map((isHit, index) => 
            isHit && (
              <Badge key={index} variant="secondary" className={compact ? "text-xs px-1" : ""}>
                {getPositionLabel(index)}
              </Badge>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default HitNotesGrid;