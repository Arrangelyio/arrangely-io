import React from 'react';
import { Badge } from '@/components/ui/badge';

interface BarHitOverlayProps {
  timeSignature: string;
  hits?: {
    subdivision: "1/4" | "1/8" | "1/16";
    markers: boolean[];
  };
  compact?: boolean;
}

const BarHitOverlay: React.FC<BarHitOverlayProps> = ({ 
  timeSignature, 
  hits,
  compact = false 
}) => {
  if (!hits || !hits.markers.some(hit => hit)) {
    return null;
  }

  const beatsPerBar = parseInt(timeSignature.split('/')[0]) || 4;
  const getSubdivisions = (subdivision: "1/4" | "1/8" | "1/16") => {
    const multiplier = subdivision === "1/4" ? 1 : subdivision === "1/8" ? 2 : 4;
    return beatsPerBar * multiplier;
  };

  const totalSubdivisions = getSubdivisions(hits.subdivision);
  const activeHits = hits.markers.slice(0, totalSubdivisions);

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
    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
      <div className="flex justify-center">
        <div className="flex gap-1 bg-background/90 backdrop-blur-sm rounded-b px-2 py-1 shadow-sm">
          {activeHits.map((isHit, index) => 
            isHit && (
              <div 
                key={index} 
                className="flex flex-col items-center"
                title={`Hit on ${getPositionLabel(index)}`}
              >
                <div className={`
                  ${compact ? 'text-xs' : 'text-sm'} 
                  text-primary font-bold animate-pulse
                `}>
                  ✦
                </div>
                <div className={`
                  ${compact ? 'text-[10px]' : 'text-xs'} 
                  text-muted-foreground font-mono leading-none
                `}>
                  {getPositionLabel(index)}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default BarHitOverlay;