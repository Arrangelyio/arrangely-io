import { Minus, Square, X, LogOut, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import logo from "../assets/Final-Logo-Arrangely-Logogram.png";

interface TitleBarProps {
    user?: SupabaseUser | null;
    onLogout?: () => void;
}

// Detect macOS via Electron's exposed platform (from main process)
const isMac = window.electron?.isMac ?? false;

export default function TitleBar({ user, onLogout }: TitleBarProps) {
    const handleMinimize = () => window.electron?.minimizeWindow();
    const handleMaximize = () => window.electron?.maximizeWindow();
    const handleClose = () => window.electron?.closeWindow();

    return (
        <div
            className="
                h-9
                bg-[hsl(0,0%,16%)]
                border-b border-[hsl(0,0%,10%)]
                flex items-center justify-between 
                select-none relative z-50
            "
            style={{ WebkitAppRegion: "drag" } as any}
        >
            {/* LEFT: Logo + Title - add padding for macOS traffic lights */}
            <div className={`flex items-center gap-2.5 ${isMac ? 'pl-20' : 'pl-3'}`}>
                <div className="w-5 h-5 flex items-center justify-center">
                    <img src={logo} className="w-4 h-4 opacity-80" alt="Arrangely Logo" />
                </div>

                <span className="text-[11px] font-medium tracking-wide text-[hsl(0,0%,65%)]">
                    Arrangely Live Studio
                </span>
            </div>

            {/* RIGHT SIDE */}
            <div
                className="flex items-center h-full"
                style={{ WebkitAppRegion: "no-drag" } as any}
            >
                {/* USER PILL */}
                {user && (
                    <div className="flex items-center mr-2">
                        <div className="flex items-center gap-2 px-2 py-1 rounded">
                            <User className="w-3 h-3 text-[hsl(0,0%,50%)]" />
                            <span className="text-[10px] text-[hsl(0,0%,55%)] max-w-[120px] truncate">
                                {user.email}
                            </span>

                            {onLogout && (
                                <button
                                    onClick={onLogout}
                                    className="
                                        w-5 h-5 flex items-center justify-center 
                                        rounded text-[hsl(0,0%,45%)]
                                        hover:bg-[hsl(0,65%,50%)] hover:text-white 
                                        transition-all duration-150
                                    "
                                    title="Logout"
                                >
                                    <LogOut className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* WINDOW CONTROLS - Windows only (macOS uses native traffic lights) */}
                {!isMac && (
                    <div className="flex items-center h-full border-l border-[hsl(0,0%,10%)]">
                        <button
                            onClick={handleMinimize}
                            className="
                                w-11 h-full flex items-center justify-center
                                text-[hsl(0,0%,50%)] hover:bg-[hsl(0,0%,20%)] hover:text-[hsl(0,0%,80%)]
                                transition-all duration-100
                            "
                            title="Minimize"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={handleMaximize}
                            className="
                                w-11 h-full flex items-center justify-center 
                                text-[hsl(0,0%,50%)] hover:bg-[hsl(0,0%,20%)] hover:text-[hsl(0,0%,80%)]
                                transition-all duration-100
                            "
                            title="Maximize"
                        >
                            <Square className="w-3 h-3" />
                        </button>

                        <button
                            onClick={handleClose}
                            className="
                                w-11 h-full flex items-center justify-center 
                                text-[hsl(0,0%,50%)] hover:bg-[hsl(0,70%,50%)] hover:text-white
                                transition-all duration-100
                            "
                            title="Close"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}