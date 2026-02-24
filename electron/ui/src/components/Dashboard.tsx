import { ChevronRight, Music, Disc3 } from 'lucide-react';

interface Setlist {
  id: string;
  name: string;
  date: string;
  theme?: string;
  songs: { id: string; position: number; sequencer: any }[];
  created_at: string;
}

interface DashboardProps {
  sequencers: any[];
  setlists: Setlist[];
  onViewAllSongs: () => void;
  onViewAllSetlists: () => void;
  onSelectSequencer: (sequencer: any) => void;
  onSelectSetlist: (setlist: Setlist) => void;
}

// Extract YouTube thumbnail from link
const getYouTubeThumbnail = (youtubeLink: string | null | undefined): string | null => {
  if (!youtubeLink) return null;
  const match = youtubeLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  }
  return null;
};

// Vinyl thumbnail component with overlapping effect and staggered rotation
const VinylThumbnail = ({ 
  thumbnail, 
  index, 
  total 
}: { 
  thumbnail: string | null; 
  index: number; 
  total: number;
}) => {
  const offset = index * 28;
  const zIndex = total - index;
  const animationDelay = index * 120; // Staggered delay for each disc
  
  return (
    <div 
      className="
        absolute w-14 h-14 rounded-full overflow-hidden 
        border-2 border-[hsl(0,0%,20%)] shadow-lg
        group-hover:scale-105 group-hover:shadow-xl
        transition-[transform,box-shadow] duration-200 ease-out
      "
      style={{ 
        left: `${offset}px`, 
        zIndex,
        animation: `vinyl-disc-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${animationDelay}ms backwards`,
        transitionDelay: `${index * 30}ms`
      }}
    >
      {thumbnail ? (
        <img 
          src={thumbnail} 
          alt="Song thumbnail" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-[hsl(0,0%,25%)] flex items-center justify-center">
          <Disc3 className="w-6 h-6 text-[hsl(0,0%,45%)]" />
        </div>
      )}
      {/* Vinyl center hole effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-3 h-3 rounded-full bg-[hsl(0,0%,12%)] border border-[hsl(0,0%,30%)] shadow-inner" />
      </div>
      {/* Subtle vinyl groove effect */}
      <div className="absolute inset-0 rounded-full pointer-events-none opacity-20 bg-[radial-gradient(circle,transparent_30%,rgba(0,0,0,0.3)_70%)]" />
    </div>
  );
};

// Setlist card component
const SetlistCard = ({ 
  setlist, 
  onClick,
  index
}: { 
  setlist: Setlist; 
  onClick: () => void;
  index: number;
}) => {
  const songThumbnails = setlist.songs
    .slice(0, 5)
    .map(s => getYouTubeThumbnail(s.sequencer?.songs?.youtube_link));

  return (
    <button
      onClick={onClick}
      className={`
        bg-[hsl(0,0%,16%)] rounded-xl p-4
        border border-[hsl(0,0%,20%)]
        hover:border-[hsl(145,65%,40%)] hover:bg-[hsl(0,0%,18%)]
        text-left w-full group
        card-interactive
        animate-item-enter stagger-${Math.min(index + 1, 8)}
      `}
    >
      {/* Vinyl thumbnails */}
      <div className="relative h-14 mb-4" style={{ width: `${Math.min(songThumbnails.length, 5) * 28 + 28}px` }}>
        {songThumbnails.map((thumbnail, idx) => (
          <VinylThumbnail 
            key={idx} 
            thumbnail={thumbnail} 
            index={idx} 
            total={songThumbnails.length}
          />
        ))}
      </div>
      
      <h3 className="text-[hsl(0,0%,90%)] font-medium text-sm truncate mb-1 transition-colors duration-150 group-hover:text-white">
        {setlist.name}
      </h3>
      <p className="text-[hsl(0,0%,50%)] text-xs transition-colors duration-150 group-hover:text-[hsl(0,0%,60%)]">
        {setlist.songs.length} songs • {new Date(setlist.date).toLocaleDateString()}
      </p>
    </button>
  );
};

// Song card component
const SongCard = ({ 
  sequencer, 
  onClick,
  index
}: { 
  sequencer: any; 
  onClick: () => void;
  index: number;
}) => {
  const song = sequencer.songs;
  const thumbnail = getYouTubeThumbnail(song?.youtube_link);

  return (
    <button
      onClick={onClick}
      className={`
        bg-[hsl(0,0%,16%)] rounded-lg p-3
        border border-[hsl(0,0%,20%)]
        hover:border-[hsl(145,65%,40%)] hover:bg-[hsl(0,0%,18%)]
        text-left w-full flex items-center gap-3 group
        card-interactive
        animate-item-enter stagger-${Math.min(index + 1, 8)}
      `}
    >
      {/* Thumbnail */}
      <div className="
        w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[hsl(0,0%,22%)]
        transition-transform duration-200 ease-out
        group-hover:scale-105 group-hover:shadow-lg
      ">
        {thumbnail ? (
          <img src={thumbnail} alt={song?.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-5 h-5 text-[hsl(0,0%,45%)]" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-[hsl(0,0%,90%)] font-medium text-sm truncate transition-colors duration-150 group-hover:text-white">
          {song?.title || 'Untitled'}
        </h3>
        <p className="text-[hsl(0,0%,50%)] text-xs truncate transition-colors duration-150 group-hover:text-[hsl(0,0%,60%)]">
          {song?.artist || 'Unknown Artist'}
        </p>
      </div>
    </button>
  );
};

export default function Dashboard({
  sequencers,
  setlists,
  onViewAllSongs,
  onViewAllSetlists,
  onSelectSequencer,
  onSelectSetlist
}: DashboardProps) {
  const recentSetlists = setlists.slice(0, 4);
  const recentSongs = sequencers.slice(0, 6);

  return (
    <div className="h-full overflow-y-auto p-6 animate-page-enter scroll-smooth">
      <h1 className="text-2xl font-bold text-[hsl(0,0%,90%)] mb-6">Dashboard</h1>
      
      {/* Setlists Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[hsl(0,0%,85%)]">Setlists</h2>
          <button
            onClick={onViewAllSetlists}
            className="
              flex items-center gap-1 text-sm text-[hsl(145,65%,50%)]
              hover:text-[hsl(145,65%,60%)] transition-colors duration-150
              btn-interactive
            "
          >
            View All
            <ChevronRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
        </div>
        
        {recentSetlists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentSetlists.map((setlist, index) => (
              <SetlistCard 
                key={setlist.id} 
                setlist={setlist} 
                onClick={() => onSelectSetlist(setlist)}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[hsl(0,0%,14%)] rounded-xl p-8 border border-[hsl(0,0%,18%)] text-center animate-item-enter">
            <Disc3 className="w-10 h-10 text-[hsl(0,0%,35%)] mx-auto mb-3" />
            <p className="text-[hsl(0,0%,50%)] text-sm">No setlists yet</p>
            <button
              onClick={onViewAllSetlists}
              className="mt-3 text-sm text-[hsl(145,65%,50%)] hover:text-[hsl(145,65%,60%)] btn-interactive"
            >
              Create your first setlist
            </button>
          </div>
        )}
      </section>

      {/* Songs Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[hsl(0,0%,85%)]">Songs</h2>
          <button
            onClick={onViewAllSongs}
            className="
              flex items-center gap-1 text-sm text-[hsl(145,65%,50%)]
              hover:text-[hsl(145,65%,60%)] transition-colors duration-150
              btn-interactive
            "
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {recentSongs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentSongs.map((sequencer, index) => (
              <SongCard 
                key={sequencer.id} 
                sequencer={sequencer} 
                onClick={() => onSelectSequencer(sequencer)}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[hsl(0,0%,14%)] rounded-xl p-8 border border-[hsl(0,0%,18%)] text-center animate-item-enter">
            <Music className="w-10 h-10 text-[hsl(0,0%,35%)] mx-auto mb-3" />
            <p className="text-[hsl(0,0%,50%)] text-sm">No songs in your library</p>
            <button
              onClick={onViewAllSongs}
              className="mt-3 text-sm text-[hsl(145,65%,50%)] hover:text-[hsl(145,65%,60%)] btn-interactive"
            >
              Browse song library
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
