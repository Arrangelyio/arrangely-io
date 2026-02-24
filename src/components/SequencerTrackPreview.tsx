import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Music2, Disc3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TrackPreview {
  index: number;
  name: string;
  color: string;
}

interface SequencerTrackPreviewProps {
  sequencerFileId: string;
}

const SequencerTrackPreview = ({ sequencerFileId }: SequencerTrackPreviewProps) => {
  const [tracks, setTracks] = useState<TrackPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fnError } = await supabase.functions.invoke('get-sequencer-tracks', {
          body: {
            sequencerFileId,
            action: 'preview'
          }
        });

        if (fnError) throw fnError;

        if (data?.tracks) {
          setTracks(data.tracks);
        }
      } catch (err) {
        console.error('Error fetching track preview:', err);
        setError('Unable to load track preview');
      } finally {
        setLoading(false);
      }
    };

    if (sequencerFileId) {
      fetchTracks();
    }
  }, [sequencerFileId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading tracks...</span>
      </div>
    );
  }

  if (error || tracks.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Disc3 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {tracks.length} Tracks Included
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tracks.map((track) => (
          <Badge
            key={track.index}
            variant="outline"
            className="text-xs font-normal px-2 py-0.5 border-border/60"
            style={{ 
              backgroundColor: `${track.color}15`,
              borderColor: `${track.color}40`
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
              style={{ backgroundColor: track.color }}
            />
            {track.name}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default SequencerTrackPreview;
