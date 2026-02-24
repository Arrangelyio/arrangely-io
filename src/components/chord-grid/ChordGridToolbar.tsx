import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Plus,
    Repeat,
    Percent,
    Undo,
    Redo,
    MoreHorizontal,
    Music2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChordGridToolbarProps {
    sectionId: string;
    selectedBarsCount: number;
    isMobile: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onAddSingleBar: (sectionId: string) => void;
    onRepeatLastBar: (sectionId: string) => void;
    onAddRepeatSign: (sectionId: string) => void;
    onWrapWithRepeatMarkers: (sectionId: string) => void;
    onAddBarRest: (sectionId: string, restCount: number) => void;
    onAddSlashNotation: (sectionId: string) => void;
    onAddFirstEnding: (sectionId: string) => void;
    onAddSecondEnding: (sectionId: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    onAddBulkBars: (sectionId: string, count: number) => void;
}

const ChordGridToolbar: React.FC<ChordGridToolbarProps> = ({
    sectionId,
    selectedBarsCount,
    isMobile,
    canUndo,
    canRedo,
    onAddSingleBar,
    onRepeatLastBar,
    onAddRepeatSign,
    onWrapWithRepeatMarkers,
    onAddBarRest,
    onAddSlashNotation,
    onAddFirstEnding,
    onAddSecondEnding,
    onUndo,
    onRedo,
    onAddBulkBars,
}) => {
    const { toast } = useToast();

    const buttonSize = isMobile ? "sm" : "sm";
    const iconSize = isMobile ? "h-3 w-3" : "h-4 w-4";

    const showSelectionHelp = () => {
        toast({
            title: isMobile ? "Mobile Selection" : "Selection Tip",
            description: isMobile 
                ? "Tap bars to select multiple, then use repeat markers"
                : "Use Ctrl+Click to select multiple bars",
        });
    };

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/30 rounded-lg border">
            {/* Basic Bar Operations */}
            <div className="flex items-center gap-1">
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={() => onAddSingleBar(sectionId)}
                    className="flex items-center gap-1"
                >
                    <Plus className={iconSize} />
                    {!isMobile && "Add Bar"}
                </Button>
                
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={() => onRepeatLastBar(sectionId)}
                    className="flex items-center gap-1"
                >
                    <Repeat className={iconSize} />
                    {!isMobile && "Repeat Bar"}
                </Button>
                
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={() => onAddRepeatSign(sectionId)}
                    className="flex items-center gap-1"
                >
                    <Percent className={iconSize} />
                    {!isMobile && "%"}
                </Button>
            </div>

            {!isMobile && <Separator orientation="vertical" className="h-6" />}

            {/* Repeat Markers */}
            <div className="flex items-center gap-1">
                <Button
                    size={buttonSize}
                    variant={selectedBarsCount > 0 ? "default" : "outline"}
                    onClick={() => onWrapWithRepeatMarkers(sectionId)}
                    className="flex items-center gap-1"
                    disabled={selectedBarsCount === 0}
                >
                    <span className="text-xs font-mono">||:</span>
                    {!isMobile && ":||"}
                </Button>
                
                {selectedBarsCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                        {selectedBarsCount} selected
                    </Badge>
                )}
            </div>

            {!isMobile && <Separator orientation="vertical" className="h-6" />}

            {/* Shortcuts */}
            <div className="flex items-center gap-1">
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={() => onAddBarRest(sectionId, 1)}
                    className="flex items-center gap-1"
                >
                    <span className="text-xs font-mono">r1</span>
                </Button>
                
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={() => onAddBarRest(sectionId, 2)}
                    className="flex items-center gap-1"
                >
                    <span className="text-xs font-mono">r2</span>
                </Button>
                
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={() => onAddSlashNotation(sectionId)}
                    className="flex items-center gap-1"
                >
                    <span className="text-xs font-mono">//</span>
                </Button>
            </div>

            {!isMobile && <Separator orientation="vertical" className="h-6" />}

            {/* Endings */}
            <div className="flex items-center gap-1">
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={() => onAddFirstEnding(sectionId)}
                    className="flex items-center gap-1"
                >
                    <span className="text-xs">1.</span>
                </Button>
                
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={() => onAddSecondEnding(sectionId)}
                    className="flex items-center gap-1"
                >
                    <span className="text-xs">2.</span>
                </Button>
            </div>

            {!isMobile && <Separator orientation="vertical" className="h-6" />}

            {/* Bulk Operations */}
            <div className="flex items-center gap-1">
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={() => onAddBulkBars(sectionId, 4)}
                    className="flex items-center gap-1"
                >
                    <span className="text-xs">+4</span>
                </Button>
                
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={() => onAddBulkBars(sectionId, 8)}
                    className="flex items-center gap-1"
                >
                    <span className="text-xs">+8</span>
                </Button>
            </div>

            {!isMobile && <Separator orientation="vertical" className="h-6" />}

            {/* History Controls */}
            <div className="flex items-center gap-1">
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="flex items-center gap-1"
                >
                    <Undo className={iconSize} />
                    {!isMobile && "Undo"}
                </Button>
                
                <Button
                    size={buttonSize}
                    variant="outline"
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="flex items-center gap-1"
                >
                    <Redo className={iconSize} />
                    {!isMobile && "Redo"}
                </Button>
            </div>

            {/* Help Icon */}
            <Button
                size={buttonSize}
                variant="ghost"
                onClick={showSelectionHelp}
                className="ml-auto"
            >
                <MoreHorizontal className={iconSize} />
            </Button>
        </div>
    );
};

export default ChordGridToolbar;