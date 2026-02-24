import React, { useState, useEffect } from "react";
import { X, Save, Clock, MousePointer } from "lucide-react";

interface SongSection {
    id: string;
    name: string | null;
    section_type: string;
}

interface MarkerFormData {
    section_id: string;
    name: string;
    start_time: number;
    end_time: number;
}

interface AddMarkerDialogProps {
    isOpen: boolean;
    isEditing: boolean;
    markerForm: MarkerFormData;
    setMarkerForm: React.Dispatch<React.SetStateAction<MarkerFormData>>;
    availableSongSections: SongSection[];
    onSave: () => void;
    onCancel: () => void;
    currentTime?: number;
    duration?: number;
}

// Helper to convert seconds to minutes:seconds
const secondsToMinSec = (totalSeconds: number): { min: number; sec: number } => {
    const min = Math.floor(totalSeconds / 60);
    const sec = Math.round((totalSeconds % 60) * 10) / 10; // Keep one decimal
    return { min, sec };
};

// Helper to convert minutes:seconds to total seconds
const minSecToSeconds = (min: number, sec: number): number => {
    return min * 60 + sec;
};

interface TimeInputProps {
    label: string;
    totalSeconds: number;
    onChange: (seconds: number) => void;
    onUseCurrentTime?: () => void;
    hint?: string;
}

const TimeInput: React.FC<TimeInputProps> = ({ label, totalSeconds, onChange, onUseCurrentTime, hint }) => {
    const { min, sec } = secondsToMinSec(totalSeconds);
    const [minutes, setMinutes] = useState(min.toString());
    const [seconds, setSeconds] = useState(sec.toString());

    useEffect(() => {
        const { min, sec } = secondsToMinSec(totalSeconds);
        setMinutes(min.toString());
        setSeconds(sec.toString());
    }, [totalSeconds]);

    const handleMinutesChange = (value: string) => {
        setMinutes(value);
        const minVal = parseInt(value) || 0;
        const secVal = parseFloat(seconds) || 0;
        onChange(minSecToSeconds(Math.max(0, minVal), secVal));
    };

    const handleSecondsChange = (value: string) => {
        setSeconds(value);
        const minVal = parseInt(minutes) || 0;
        const secVal = parseFloat(value) || 0;
        onChange(minSecToSeconds(minVal, Math.min(59.9, Math.max(0, secVal))));
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[hsl(0,0%,70%)]">
                    {label}
                </label>
                {onUseCurrentTime && (
                    <button
                        type="button"
                        onClick={onUseCurrentTime}
                        className="flex items-center gap-1 text-xs text-[hsl(145,65%,50%)] hover:text-[hsl(145,65%,60%)] transition-colors"
                        title="Use current playhead position"
                    >
                        <MousePointer className="w-3 h-3" />
                        Use playhead
                    </button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            value={minutes}
                            onChange={(e) => handleMinutesChange(e.target.value)}
                            className="w-full px-3 py-2.5 bg-[hsl(0,0%,14%)] border border-[hsl(0,0%,25%)] rounded-lg text-[hsl(0,0%,90%)] focus:outline-none focus:border-[hsl(145,65%,50%)] focus:ring-1 focus:ring-[hsl(145,65%,50%)] transition-colors text-center font-mono"
                            placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(0,0%,50%)]">min</span>
                    </div>
                </div>
                <span className="text-xl font-bold text-[hsl(0,0%,50%)]">:</span>
                <div className="flex-1">
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            max="59.9"
                            step="0.1"
                            value={seconds}
                            onChange={(e) => handleSecondsChange(e.target.value)}
                            className="w-full px-3 py-2.5 bg-[hsl(0,0%,14%)] border border-[hsl(0,0%,25%)] rounded-lg text-[hsl(0,0%,90%)] focus:outline-none focus:border-[hsl(145,65%,50%)] focus:ring-1 focus:ring-[hsl(145,65%,50%)] transition-colors text-center font-mono"
                            placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(0,0%,50%)]">sec</span>
                    </div>
                </div>
            </div>
            {hint && (
                <p className="text-xs text-[hsl(0,0%,45%)] mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {hint}
                </p>
            )}
        </div>
    );
};

export const AddMarkerDialog: React.FC<AddMarkerDialogProps> = ({
    isOpen,
    isEditing,
    markerForm,
    setMarkerForm,
    availableSongSections,
    onSave,
    onCancel,
    currentTime = 0,
    duration = 0,
}) => {
    if (!isOpen) return null;

    const formatTime = (seconds: number): string => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[hsl(0,0%,18%)] border border-[hsl(0,0%,25%)] rounded-xl w-[420px] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(0,0%,22%)] bg-[hsl(0,0%,16%)]">
                    <h3 className="text-lg font-semibold text-[hsl(0,0%,95%)]">
                        {isEditing ? "Edit Marker" : "Add Marker"}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="p-1.5 hover:bg-[hsl(0,0%,25%)] rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-[hsl(0,0%,60%)]" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                    {/* Song Section */}
                    <div>
                        <label className="text-sm font-medium text-[hsl(0,0%,70%)] block mb-2">
                            Song Section
                        </label>
                        <select
                            value={markerForm.section_id}
                            onChange={(e) =>
                                setMarkerForm({
                                    ...markerForm,
                                    section_id: e.target.value,
                                })
                            }
                            className="w-full px-3 py-2.5 bg-[hsl(0,0%,14%)] border border-[hsl(0,0%,25%)] rounded-lg text-[hsl(0,0%,90%)] focus:outline-none focus:border-[hsl(145,65%,50%)] focus:ring-1 focus:ring-[hsl(145,65%,50%)] transition-colors appearance-none cursor-pointer"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 12px center',
                            }}
                        >
                            <option value="">Select a section...</option>
                            {availableSongSections.map((section) => (
                                <option key={section.id} value={section.id}>
                                    {section.name || section.section_type}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="text-sm font-medium text-[hsl(0,0%,70%)] block mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={markerForm.name}
                            onChange={(e) =>
                                setMarkerForm({
                                    ...markerForm,
                                    name: e.target.value,
                                })
                            }
                            className="w-full px-3 py-2.5 bg-[hsl(0,0%,14%)] border border-[hsl(0,0%,25%)] rounded-lg text-[hsl(0,0%,90%)] placeholder-[hsl(0,0%,45%)] focus:outline-none focus:border-[hsl(145,65%,50%)] focus:ring-1 focus:ring-[hsl(145,65%,50%)] transition-colors"
                            placeholder="Verse 1, Chorus, etc."
                        />
                    </div>

                    {/* Divider with hint */}
                    <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-[hsl(0,0%,22%)]" />
                        <span className="text-xs text-[hsl(0,0%,45%)] flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            Time Range
                        </span>
                        <div className="flex-1 h-px bg-[hsl(0,0%,22%)]" />
                    </div>

                    {/* Start Time */}
                    <TimeInput
                        label="Start Time"
                        totalSeconds={markerForm.start_time}
                        onChange={(seconds) =>
                            setMarkerForm({ ...markerForm, start_time: seconds })
                        }
                        onUseCurrentTime={() =>
                            setMarkerForm({ ...markerForm, start_time: currentTime })
                        }
                        hint={`Current playhead: ${formatTime(currentTime)}`}
                    />

                    {/* End Time */}
                    <TimeInput
                        label="End Time"
                        totalSeconds={markerForm.end_time}
                        onChange={(seconds) =>
                            setMarkerForm({ ...markerForm, end_time: seconds })
                        }
                        onUseCurrentTime={() =>
                            setMarkerForm({ ...markerForm, end_time: currentTime })
                        }
                        hint={duration > 0 ? `Total duration: ${formatTime(duration)}` : undefined}
                    />

                    {/* Ctrl+Click hint */}
                    <div className="bg-[hsl(0,0%,14%)] border border-[hsl(0,0%,22%)] rounded-lg p-3">
                        <p className="text-xs text-[hsl(0,0%,55%)] flex items-start gap-2">
                            <MousePointer className="w-3.5 h-3.5 mt-0.5 text-[hsl(145,65%,50%)]" />
                            <span>
                                <strong className="text-[hsl(0,0%,70%)]">Tip:</strong> Click "Use playhead" to set start/end times from the current playback position, or navigate to a specific position first.
                            </span>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-[hsl(0,0%,22%)] bg-[hsl(0,0%,16%)]">
                    <button
                        onClick={onSave}
                        disabled={!markerForm.section_id || !markerForm.name}
                        className="flex-1 bg-[hsl(145,65%,45%)] hover:bg-[hsl(145,65%,50%)] disabled:bg-[hsl(0,0%,30%)] disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-lg"
                    >
                        <Save className="w-4 h-4" />
                        Save
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 border border-[hsl(0,0%,30%)] text-[hsl(0,0%,70%)] rounded-lg hover:bg-[hsl(0,0%,22%)] font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMarkerDialog;
