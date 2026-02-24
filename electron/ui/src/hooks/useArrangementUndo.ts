import { useState, useCallback, useRef } from 'react';

export interface UndoableSection {
  id: string;
  dbId?: string;
  name: string;
  start_time: number;
  end_time: number;
  color?: string;
  song_section_id?: string;
}

interface UndoAction {
  type: 'delete' | 'update' | 'add';
  section: UndoableSection;
  previousState?: UndoableSection;
}

interface UseArrangementUndoOptions {
  maxHistorySize?: number;
}

export function useArrangementUndo(options: UseArrangementUndoOptions = {}) {
  const { maxHistorySize = 50 } = options;
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);

  // Track the last deleted section for restore
  const lastDeletedRef = useRef<UndoableSection | null>(null);

  const pushUndo = useCallback((action: UndoAction) => {
    setUndoStack(prev => {
      const newStack = [...prev, action];
      // Limit history size
      if (newStack.length > maxHistorySize) {
        return newStack.slice(-maxHistorySize);
      }
      return newStack;
    });
    // Clear redo stack when new action is performed
    setRedoStack([]);

    // Track last deleted for quick access
    if (action.type === 'delete') {
      lastDeletedRef.current = action.section;
    }
  }, [maxHistorySize]);

  const recordDelete = useCallback((section: UndoableSection) => {
    pushUndo({
      type: 'delete',
      section: { ...section },
    });
  }, [pushUndo]);

  const recordUpdate = useCallback((section: UndoableSection, previousState: UndoableSection) => {
    pushUndo({
      type: 'update',
      section: { ...section },
      previousState: { ...previousState },
    });
  }, [pushUndo]);

  const recordAdd = useCallback((section: UndoableSection) => {
    pushUndo({
      type: 'add',
      section: { ...section },
    });
  }, [pushUndo]);

  const popUndo = useCallback((): UndoAction | null => {
    let action: UndoAction | null = null;
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      action = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (action) {
      setRedoStack(prev => [...prev, action!]);
    }
    return action;
  }, []);

  const popRedo = useCallback((): UndoAction | null => {
    let action: UndoAction | null = null;
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      action = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (action) {
      setUndoStack(prev => [...prev, action!]);
    }
    return action;
  }, []);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const lastDeleted = lastDeletedRef.current;

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    lastDeletedRef.current = null;
  }, []);

  return {
    recordDelete,
    recordUpdate,
    recordAdd,
    popUndo,
    popRedo,
    canUndo,
    canRedo,
    undoStack,
    redoStack,
    lastDeleted,
    clearHistory,
  };
}
