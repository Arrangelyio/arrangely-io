/**
 * Mixer Preset Controls Component
 * 
 * Provides UI for saving, loading, and managing mixer presets.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Save, FolderOpen, Trash2, Edit2, Check, X, ChevronDown } from 'lucide-react';
import { MixerPreset, TrackPresetSettings, ClickTrackPresetSettings, CueTrackPresetSettings } from '../types/mixerPreset';
import { cn } from '@/lib/utils';

interface MixerPresetControlsProps {
  presets: MixerPreset[];
  activePresetId: string | null;
  onSavePreset: (name: string) => void;
  onLoadPreset: (presetId: string) => void;
  onUpdatePreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
  onRenamePreset: (presetId: string, newName: string) => void;
  className?: string;
}

export default function MixerPresetControls({
  presets,
  activePresetId,
  onSavePreset,
  onLoadPreset,
  onUpdatePreset,
  onDeletePreset,
  onRenamePreset,
  className,
}: MixerPresetControlsProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowSaveDialog(false);
        setEditingPresetId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when save dialog opens
  useEffect(() => {
    if (showSaveDialog && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSaveDialog]);

  const handleSave = () => {
    if (newPresetName.trim()) {
      onSavePreset(newPresetName.trim());
      setNewPresetName('');
      setShowSaveDialog(false);
      setShowDropdown(false);
    }
  };

  const handleRename = (presetId: string) => {
    if (editingName.trim()) {
      onRenamePreset(presetId, editingName.trim());
      setEditingPresetId(null);
      setEditingName('');
    }
  };

  const activePreset = presets.find(p => p.id === activePresetId);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
          activePreset
            ? "bg-primary/20 text-primary border border-primary/30"
            : "bg-secondary hover:bg-secondary/80 text-muted-foreground border border-border"
        )}
      >
        <FolderOpen className="w-3.5 h-3.5" />
        <span className="max-w-[120px] truncate">
          {activePreset ? activePreset.name : 'Presets'}
        </span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", showDropdown && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-[hsl(220,15%,13%)] border border-[hsl(220,10%,25%)] rounded-lg shadow-2xl z-[100] overflow-hidden">
          {/* Save New Preset */}
          <div className="p-2 border-b border-[hsl(220,10%,22%)]">
            {showSaveDialog ? (
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                      setShowSaveDialog(false);
                      setNewPresetName('');
                    }
                  }}
                  placeholder="Preset name..."
                  className="flex-1 px-2 py-1 text-xs bg-[hsl(220,12%,18%)] border border-[hsl(220,10%,28%)] rounded text-[hsl(0,0%,85%)] placeholder:text-[hsl(220,8%,45%)] focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleSave}
                  disabled={!newPresetName.trim()}
                  className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setNewPresetName('');
                  }}
                  className="p-1 rounded bg-[hsl(220,12%,20%)] hover:bg-[hsl(220,12%,25%)] text-[hsl(220,8%,60%)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-medium bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Current Settings
              </button>
            )}
          </div>

          {/* Update Active Preset */}
          {activePreset && (
            <div className="p-2 border-b border-[hsl(220,10%,22%)]">
              <button
                onClick={() => {
                  onUpdatePreset(activePreset.id);
                  setShowDropdown(false);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-medium bg-[hsl(220,12%,20%)] hover:bg-[hsl(220,12%,25%)] text-[hsl(0,0%,85%)] transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Update "{activePreset.name}"
              </button>
            </div>
          )}

          {/* Presets List */}
          <div className="max-h-48 overflow-y-auto bg-[hsl(220,15%,11%)]">
            {presets.length === 0 ? (
              <div className="p-4 text-center text-xs text-[hsl(220,8%,45%)]">
                No saved presets
              </div>
            ) : (
              presets.map((preset) => (
                <div
                  key={preset.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 transition-colors",
                    preset.id === activePresetId 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-[hsl(220,12%,18%)]"
                  )}
                >
                  {editingPresetId === preset.id ? (
                    // Editing mode
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(preset.id);
                          if (e.key === 'Escape') {
                            setEditingPresetId(null);
                            setEditingName('');
                          }
                        }}
                        className="flex-1 px-1.5 py-0.5 text-xs bg-[hsl(220,12%,16%)] border border-[hsl(220,10%,28%)] rounded text-[hsl(0,0%,85%)] focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(preset.id)}
                        className="p-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingPresetId(null);
                          setEditingName('');
                        }}
                        className="p-0.5 rounded bg-[hsl(220,12%,20%)] hover:bg-[hsl(220,12%,25%)] text-[hsl(220,8%,60%)]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    // Normal mode
                    <>
                      <button
                        onClick={() => {
                          onLoadPreset(preset.id);
                          setShowDropdown(false);
                        }}
                        className={cn(
                          "flex-1 text-left text-sm truncate transition-colors",
                          preset.id === activePresetId 
                            ? "text-primary-foreground font-medium" 
                            : "text-[hsl(0,0%,80%)] hover:text-primary"
                        )}
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => {
                          setEditingPresetId(preset.id);
                          setEditingName(preset.name);
                        }}
                        className={cn(
                          "p-1 rounded transition-colors",
                          preset.id === activePresetId 
                            ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" 
                            : "text-[hsl(220,8%,50%)] hover:text-[hsl(0,0%,85%)] hover:bg-[hsl(220,12%,20%)]"
                        )}
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeletePreset(preset.id)}
                        className={cn(
                          "p-1 rounded transition-colors",
                          preset.id === activePresetId 
                            ? "text-primary-foreground/70 hover:text-red-300 hover:bg-primary-foreground/10" 
                            : "text-[hsl(220,8%,50%)] hover:text-[hsl(0,65%,55%)] hover:bg-[hsl(0,50%,20%)]"
                        )}
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
