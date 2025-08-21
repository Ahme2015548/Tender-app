import { useState, useCallback, useRef } from 'react';

export const useDragAndDrop = () => {
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedItem: null,
    draggedFrom: null,
    dragOverTarget: null
  });

  const dragRef = useRef(null);
  const dragImageRef = useRef(null);

  // Reset drag state
  const resetDragState = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItem: null,
      draggedFrom: null,
      dragOverTarget: null
    });
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((event, item, source) => {
    try {
      console.log('🚀 [DRAG START] Item:', item?.title || item?.id, 'Source:', source);
      
      // Set drag data
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', JSON.stringify({ item, source }));
      
      // Update drag state immediately for smooth feedback
      setDragState({
        isDragging: true,
        draggedItem: item,
        draggedFrom: source,
        dragOverTarget: null
      });

      // Store reference without modifying style immediately
      dragRef.current = event.currentTarget;
      
    } catch (error) {
      console.error('❌ [DRAG START ERROR]:', error);
      resetDragState();
    }
  }, [resetDragState]);

  // Handle drag end
  const handleDragEnd = useCallback((event) => {
    console.log('🏁 [DRAG END]');
    
    // Clear reference
    dragRef.current = null;
    
    // Immediate state reset for stability
    resetDragState();
  }, [resetDragState]);

  // Handle drag over
  const handleDragOver = useCallback((event, target) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    // Update drag over target
    setDragState(prev => ({
      ...prev,
      dragOverTarget: target
    }));
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((event) => {
    // Only reset if leaving the actual drop zone
    const relatedTarget = event.relatedTarget;
    const currentTarget = event.currentTarget;
    
    if (!currentTarget.contains(relatedTarget)) {
      setDragState(prev => ({
        ...prev,
        dragOverTarget: null
      }));
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((event, target, onDrop) => {
    event.preventDefault();
    console.log('💧 [DROP] Target:', target);

    try {
      // Get drag data
      const dragData = event.dataTransfer.getData('text/plain');
      let parsedData = null;

      try {
        parsedData = JSON.parse(dragData);
      } catch (parseError) {
        // Fallback to current drag state
        parsedData = {
          item: dragState.draggedItem,
          source: dragState.draggedFrom
        };
      }

      if (!parsedData || !parsedData.item) {
        console.error('❌ [DROP ERROR] No drag data available');
        return;
      }

      const { item, source } = parsedData;

      // Prevent dropping on same location
      if (source === target) {
        console.log('⚠️ [DROP CANCELLED] Same source and target');
        return;
      }

      console.log('✅ [DROP SUCCESS] Moving:', item?.title || item?.id, 'from', source, 'to', target);

      // Call the drop handler
      if (typeof onDrop === 'function') {
        onDrop(item, source, target);
      }

    } catch (error) {
      console.error('❌ [DROP ERROR]:', error);
    } finally {
      // Reset drag over state
      setDragState(prev => ({
        ...prev,
        dragOverTarget: null
      }));
    }
  }, [dragState]);

  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    resetDragState
  };
};