import { Library, Settings, ArrowLeft, ListMusic, LayoutDashboard } from 'lucide-react';

interface SidebarProps {
  currentView: 'dashboard' | 'library' | 'setlists' | 'player' | 'setlist-player';
  onViewChange: (view: 'dashboard' | 'library' | 'setlists' | 'player' | 'setlist-player') => void;
  onBackToLibrary: () => void;
  onBackToSetlists: () => void;
  onBackToDashboard: () => void;
}

const NavButton = ({ 
    title, 
    onClick, 
    isActive = false,
    children 
}: { 
    title: string, 
    onClick: () => void, 
    isActive?: boolean, 
    children: React.ReactNode 
}) => {
    return (
        <button
            onClick={onClick}
            className={`
                w-10 h-10 flex items-center justify-center rounded-lg
                nav-btn-interactive relative overflow-hidden
                ${isActive
                    ? 'bg-[hsl(0,0%,28%)] text-[hsl(0,0%,90%)] shadow-inner'
                    : 'text-[hsl(0,0%,50%)] hover:bg-[hsl(0,0%,22%)] hover:text-[hsl(0,0%,75%)]'
                }
            `}
            title={title}
        >
            {/* Active indicator */}
            <span 
                className={`
                    absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full
                    bg-[hsl(145,65%,50%)] transition-all duration-200
                    ${isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}
                `}
            />
            <span className="nav-icon transition-transform duration-200">
                {children}
            </span>
        </button>
    );
};

export default function Sidebar({ currentView, onViewChange, onBackToLibrary, onBackToSetlists, onBackToDashboard }: SidebarProps) {
  const isInPlayer = currentView === 'player' || currentView === 'setlist-player';

  return (
    <div className="
        w-14 bg-[hsl(0,0%,14%)] 
        border-r border-[hsl(0,0%,10%)]
        flex flex-col items-center justify-between 
        py-3
    ">
        <div className="flex flex-col items-center gap-2">
            {isInPlayer ? (
                <button
                    onClick={currentView === 'setlist-player' ? onBackToSetlists : onBackToDashboard}
                    className="
                        w-10 h-10 flex items-center justify-center rounded-lg
                        bg-[hsl(0,0%,20%)] text-[hsl(0,0%,60%)]
                        hover:bg-[hsl(0,0%,25%)] hover:text-[hsl(0,0%,85%)]
                        border border-[hsl(0,0%,25%)]
                        btn-interactive group
                    "
                    title={currentView === 'setlist-player' ? "Back to Setlists" : "Back to Dashboard"}
                >
                    <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                </button>
            ) : (
                <>
                    <NavButton
                        title="Dashboard"
                        onClick={() => onViewChange('dashboard')}
                        isActive={currentView === 'dashboard'}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                    </NavButton>

                    <NavButton
                        title="Library"
                        onClick={() => onViewChange('library')}
                        isActive={currentView === 'library'}
                    >
                        <Library className="w-4 h-4" />
                    </NavButton>

                    <NavButton
                        title="Setlists"
                        onClick={() => onViewChange('setlists')}
                        isActive={currentView === 'setlists'}
                    >
                        <ListMusic className="w-4 h-4" />
                    </NavButton>
                </>
            )}
        </div>

        <div className="flex flex-col items-center gap-2">
            {!isInPlayer && (
                 <NavButton
                    title="Settings"
                    onClick={() => { /* Settings logic */ }}
                    isActive={false}
                >
                    <Settings className="w-4 h-4" />
                </NavButton>
            )}
        </div>
    </div>
  );
}