import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Pen, 
  Eraser, 
  Undo, 
  Redo, 
  Trash2, 
  MousePointer,
  Palette,
  Minus,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DrawingCanvasProps {
  setlistId?: string;
  songId?: string;
  sectionId?: string | null; // null means "All Sections"
  isOwner?: boolean;
  onAnnotationsChange?: (annotations: any) => void;
  className?: string;
  width?: number;
  height?: number;
  isVisible?: boolean;
  viewOnlyMode?: boolean; // New prop for view-only mode (no drawing tools)
  showAnnotations?: boolean; // Controls whether to show annotations in view-only mode
}

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#64748b', // slate
  '#000000', // black
  '#ffffff', // white
];

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  setlistId,
  songId,
  sectionId,
  isOwner = false,
  onAnnotationsChange,
  className = '',
  width = 800,
  height = 600,
  isVisible = true,
  viewOnlyMode = false,
  showAnnotations = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'pointer'>('pointer');
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(3);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // Track if annotations are loaded
  const { toast } = useToast();

  // Get effective section ID - use a default when "All Sections" is selected
  const effectiveSectionId = sectionId || 'all_sections';

  // Handle toolbar dragging
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = toolbarRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && toolbarRef.current) {
      const container = toolbarRef.current.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const newX = e.clientX - containerRect.left - dragOffset.x;
        const newY = e.clientY - containerRect.top - dragOffset.y;
        
        // Constrain to container bounds
        const maxX = containerRect.width - 200; // Approximate toolbar width
        const maxY = containerRect.height - 100; // Approximate toolbar height
        
        setToolbarPosition({
          x: Math.max(0, Math.min(maxX, newX)),
          y: Math.max(0, Math.min(maxY, newY))
        });
      }
    }
  }, [isDragging, dragOffset.x, dragOffset.y]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Set up dragging event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Clear canvas when not visible and reset loaded state
  useEffect(() => {
    if (!isVisible && fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.renderAll();
      setHasUnsavedChanges(false);
      setIsLoaded(false); // Reset loaded state so annotations reload when visible again
    }
  }, [isVisible, fabricCanvas]);

  // Clear canvas and reset when showAnnotations is toggled off
  useEffect(() => {
    if (fabricCanvas && showAnnotations !== undefined && !showAnnotations) {
      fabricCanvas.clear();
      fabricCanvas.renderAll();
      setIsLoaded(false);
    }
  }, [showAnnotations, fabricCanvas]);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: 'transparent',
      selection: tool === 'pointer',
    });

    // Configure drawing brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = color;
    canvas.freeDrawingBrush.width = brushSize;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [width, height]);

  // Update canvas mode based on selected tool
  useEffect(() => {
    if (!fabricCanvas) return;

    switch (tool) {
      case 'pen':
        fabricCanvas.isDrawingMode = true;
        fabricCanvas.selection = false;
        fabricCanvas.freeDrawingBrush.color = color;
        fabricCanvas.freeDrawingBrush.width = brushSize;
        break;
      case 'eraser':
        // Use proper eraser mode for Fabric.js v6
        fabricCanvas.isDrawingMode = false;
        fabricCanvas.selection = true;
        break;
      case 'pointer':
        fabricCanvas.isDrawingMode = false;
        fabricCanvas.selection = true;
        break;
    }
  }, [tool, color, brushSize, fabricCanvas]);

  // Save state for undo/redo
  const saveState = useCallback(() => {
    if (!fabricCanvas) return;
    
    const state = JSON.stringify(fabricCanvas.toJSON());
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    
    // Limit history to 20 states
    if (newHistory.length > 20) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  }, [fabricCanvas, history, historyIndex]);

  // Listen for canvas changes
  useEffect(() => {
    if (!fabricCanvas) return;

    const handlePathCreated = () => {
      // Save state immediately for drawings to prevent disappearing
      saveState();
      setHasUnsavedChanges(true);
    };

    const handleObjectModified = () => {
      saveState();
      setHasUnsavedChanges(true);
    };

    // Eraser functionality - click to delete objects
    const handleMouseDown = (e: any) => {
      if (tool === 'eraser' && fabricCanvas) {
        const target = fabricCanvas.findTarget(e.e);
        
        if (target) {
          fabricCanvas.remove(target);
          fabricCanvas.requestRenderAll();
          saveState();
          setHasUnsavedChanges(true);
        }
      }
    };

    fabricCanvas.on('path:created', handlePathCreated);
    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('mouse:down', handleMouseDown);

    // Save initial state only once
    if (history.length === 0) {
      setTimeout(() => saveState(), 200);
    }

    return () => {
      fabricCanvas.off('path:created', handlePathCreated);
      fabricCanvas.off('object:modified', handleObjectModified);
      fabricCanvas.off('mouse:down', handleMouseDown);
    };
  }, [fabricCanvas, saveState, tool, history.length]);

  // Save annotations to database (without auto-broadcast)
  const saveAnnotations = useCallback(async () => {
  if (!fabricCanvas || !setlistId || !songId || !isOwner) {
    console.log("❌ Skip save: missing requirement", {
      fabricCanvas,
      setlistId,
      songId,
      isOwner,
    });
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      
      return;
    }

    const annotationData = fabricCanvas.toJSON();

    // Use effectiveSectionId for database operations
    const dbSectionId = effectiveSectionId === 'all_sections' ? null : effectiveSectionId;

    console.log("✅ Ready to save annotation", {
      setlistId,
      songId,
      effectiveSectionId,
      dbSectionId,
      userId: user.id,
      annotationData,
    });

    // Query based on section ID (null for "All Sections")
    let query = supabase
      .from('setlist_annotations')
      .select('id')
      .eq('setlist_id', setlistId)
      .eq('song_id', songId)
      .eq('user_id', user.id);

    if (dbSectionId) {
      query = query.eq('section_id', dbSectionId);
    } else {
      query = query.is('section_id', null);
    }

    const { data: existing, error: queryError } = await query.maybeSingle();
    

    if (existing) {
      const { error: updateError } = await supabase
        .from('setlist_annotations')
        .update({
          annotation_data: annotationData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error("❌ Update error:", updateError);
      } else {
        
      }
    } else {
      const { error: insertError } = await supabase
        .from('setlist_annotations')
        .insert({
          setlist_id: setlistId,
          song_id: songId,
          section_id: dbSectionId,
          user_id: user.id,
          annotation_data: annotationData,
        });

      if (insertError) {
        console.error("❌ Insert error:", insertError);
      } else {
        
      }
    }

    onAnnotationsChange?.(annotationData);
  } catch (error) {
    console.error("Error saving annotations:", error);
  }
}, [fabricCanvas, setlistId, songId, effectiveSectionId, isOwner, onAnnotationsChange]);


  // Broadcast annotations to all users (only called when Apply is clicked)
  const broadcastAnnotations = useCallback(async () => {
    if (!fabricCanvas || !setlistId || !songId) return;
    
    try {
      const {data: { user }} = await supabase.auth.getUser();
      if (!user) return;
      
      const annotationData = fabricCanvas.toJSON();
      const dbSectionId = effectiveSectionId === 'all_sections' ? null : effectiveSectionId;
      
      // Broadcast changes to realtime channel for all users
      const channel = supabase.channel(`setlist-annotations:${setlistId}`);
      await channel.send({
        type: 'broadcast',
        event: 'annotation_update',
        payload: {
          setlist_id: setlistId,
          song_id: songId,
          section_id: dbSectionId,
          annotation_data: annotationData,
          user_id: user.id,
          timestamp: new Date().toISOString()
        }
      });
      
      
    } catch (error) {
      console.error('Error broadcasting annotations:', error);
    }
  }, [fabricCanvas, setlistId, songId, effectiveSectionId]);

  // Load existing annotations - only when canvas should show annotations
  const loadAnnotations = useCallback(async () => {
    if (!fabricCanvas || !setlistId || !songId || isLoaded || !showAnnotations) return;

    try {
      let allAnnotations: any = null;
      const dbSectionId = effectiveSectionId === 'all_sections' ? null : effectiveSectionId;
      
      if (dbSectionId === null) {
        // Load all sections - merge all annotation data
        const { data } = await supabase
          .from('setlist_annotations')
          .select('annotation_data')
          .eq('setlist_id', setlistId)
          .eq('song_id', songId)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          // Merge all annotation data from all sections
          const mergedObjects: any[] = [];
          data.forEach(item => {
            if (item.annotation_data?.objects) {
              mergedObjects.push(...item.annotation_data.objects);
            }
          });
          
          if (mergedObjects.length > 0) {
            allAnnotations = {
              // Fabric v6 will ignore version, but keeping structure consistent
              objects: mergedObjects
            };
          }
        }
      } else {
        // Load specific section
        const { data } = await supabase
          .from('setlist_annotations')
          .select('annotation_data')
          .eq('setlist_id', setlistId)
          .eq('song_id', songId)
          .eq('section_id', dbSectionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.annotation_data) {
          allAnnotations = data.annotation_data;
        }
      }

      // Always clear before loading to avoid stale/ghost drawings
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = 'transparent';

      if (allAnnotations) {
        // IMPORTANT: In Fabric v6, loadFromJSON returns a Promise. Await it and then render.
        await fabricCanvas.loadFromJSON(allAnnotations as any);
        fabricCanvas.requestRenderAll();
        saveState();
        setIsLoaded(true);
      } else {
        // Nothing to load, just mark as loaded and render a clean canvas
        fabricCanvas.requestRenderAll();
        setIsLoaded(true);
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
      setIsLoaded(true);
    }
  }, [fabricCanvas, setlistId, songId, effectiveSectionId, isLoaded, saveState]);

  // Load annotations when canvas becomes visible and ready or when showAnnotations is toggled on
  useEffect(() => {
    if (isVisible && fabricCanvas && !isLoaded && showAnnotations) {
      loadAnnotations();
    }
  }, [isVisible, fabricCanvas, isLoaded, loadAnnotations, showAnnotations]);

  // Reload annotations when section changes - clear first then reload
  useEffect(() => {
    if (isVisible && fabricCanvas && showAnnotations) {
      fabricCanvas.clear();
      fabricCanvas.renderAll();
      setIsLoaded(false); // Reset loaded state to trigger reload
    }
  }, [effectiveSectionId, fabricCanvas, isVisible, showAnnotations]);

  // Set up realtime subscriptions for live annotations - avoid re-subscriptions
  useEffect(() => {
    if (!setlistId || !fabricCanvas || !isLoaded) return;

    let currentUserId: string | null = null;
    
    const getUser = async () => {
      const {data: { user }} = await supabase.auth.getUser();
      currentUserId = user?.id || null;
    };
    
    getUser();

    const dbSectionId = effectiveSectionId === 'all_sections' ? null : effectiveSectionId;
    
    const channel = supabase
      .channel(`setlist-annotations:${setlistId}:${effectiveSectionId}`)
      .on(
        'broadcast',
        { event: 'annotation_update' },
        (payload) => {
          // Only update if this is for the current song/section, NOT from current user, and no unsaved changes
          const isSameSection = dbSectionId === null 
            ? true // "All Sections" mode - accept all updates
            : payload.payload.section_id === dbSectionId;
            
          if (
            payload.payload.song_id === songId &&
            payload.payload.setlist_id === setlistId &&
            isSameSection &&
            payload.payload.user_id !== currentUserId &&
            !hasUnsavedChanges
          ) {
            try {
              
              
              fabricCanvas.loadFromJSON(payload.payload.annotation_data, () => {
                fabricCanvas.renderAll();
              });
            } catch (error) {
              console.error('Error loading realtime annotations:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setlistId, effectiveSectionId, songId, isLoaded]); // Remove hasUnsavedChanges from deps to avoid re-subscriptions

  // Undo functionality
  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && history.length > 1) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      
      if (fabricCanvas && history[newIndex]) {
        fabricCanvas.loadFromJSON(history[newIndex], () => {
          fabricCanvas.renderAll();
        });
      }
    }
  }, [fabricCanvas, history, historyIndex]);

  // Redo functionality
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      
      if (fabricCanvas && history[newIndex]) {
        fabricCanvas.loadFromJSON(history[newIndex], () => {
          fabricCanvas.renderAll();
        });
      }
    }
  }, [fabricCanvas, history, historyIndex]);

  // Apply changes and broadcast to other users
  const handleApply = useCallback(() => {
  // if (!hasUnsavedChanges) return;

  saveAnnotations();
  broadcastAnnotations();
  setHasUnsavedChanges(false);

  toast({
    title: "Changes Applied",
    description: "Your annotations have been shared with all users.",
  });
}, [hasUnsavedChanges, saveAnnotations, broadcastAnnotations, toast]);

  const handleClear = useCallback(() => {
    if (!fabricCanvas) return;
    
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = 'transparent';
    fabricCanvas.renderAll();
    saveState();
    setHasUnsavedChanges(true);
    
    toast({
      title: "Canvas Cleared",
      description: "All annotations have been removed.",
    });
  }, [fabricCanvas, saveState, toast]);

  // Show view-only mode (no tools) when not owner or in viewOnlyMode
  if (!isOwner || !isVisible || viewOnlyMode) {
    return (
      <div className={className}>
        {isVisible && (
          <canvas 
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10, opacity: isVisible ? 1 : 0 }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`} style={{ display: isVisible ? 'block' : 'none' }}>
      {/* Drawing Canvas - covers entire area */}
      <canvas 
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-auto"
        style={{ zIndex: 10 }}
      />
      
      {/* Draggable Toolbar */}
      <div 
        ref={toolbarRef}
        className="absolute z-20 bg-background/95 backdrop-blur border rounded-lg p-2 shadow-lg pointer-events-auto cursor-move"
        style={{ 
          top: toolbarPosition.y || 8, 
          right: toolbarPosition.x || 8,
          left: 'auto',
          transform: toolbarPosition.x || toolbarPosition.y ? 'none' : 'translateX(-100%)'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-1 mb-2">
          <Badge variant="outline" className="text-xs px-1 py-0">
            Tools
          </Badge>
          {hasUnsavedChanges && (
            <Button
              size="sm"
              onClick={handleApply}
              className="text-xs h-5 px-2"
            >
              Apply
            </Button>
          )}
        </div>
        
        {/* Tool Selection */}
        <div className="flex items-center gap-1 mb-2">
          <Button
            size="sm"
            variant={tool === 'pointer' ? 'default' : 'outline'}
            onClick={() => setTool('pointer')}
            className="h-6 w-6 p-0"
          >
            <MousePointer className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant={tool === 'pen' ? 'default' : 'outline'}
            onClick={() => setTool('pen')}
            className="h-6 w-6 p-0"
          >
            <Pen className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant={tool === 'eraser' ? 'default' : 'outline'}
            onClick={() => setTool('eraser')}
            className="h-6 w-6 p-0"
          >
            <Eraser className="h-3 w-3" />
          </Button>
        </div>

        {/* Color Palette - compact grid */}
        {tool === 'pen' && (
          <>
            <div className="grid grid-cols-5 gap-0.5 mb-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-4 h-4 rounded border ${
                    color === c ? 'border-foreground border-2' : 'border-border'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </>
        )}

        {/* Brush Size - horizontal layout */}
        {(tool === 'pen' || tool === 'eraser') && (
          <>
            <div className="flex items-center gap-1 mb-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBrushSize(Math.max(1, brushSize - 1))}
                className="h-5 w-5 p-0"
              >
                <Minus className="h-2 w-2" />
              </Button>
              <span className="text-xs font-mono w-4 text-center text-[10px]">{brushSize}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBrushSize(Math.min(20, brushSize + 1))}
                className="h-5 w-5 p-0"
              >
                <Plus className="h-2 w-2" />
              </Button>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="h-6 w-6 p-0"
          >
            <Undo className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="h-6 w-6 p-0"
          >
            <Redo className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClear}
            className="h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DrawingCanvas;