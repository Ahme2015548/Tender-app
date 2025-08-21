/**
 * Modern Drag & Drop Hook for React 19
 * 
 * Senior React pattern using native HTML5 drag-and-drop API
 * with proper React 19 patterns and performance optimizations
 */

import { useCallback, useRef, useState } from 'react';

export const useModernDragDrop = (items, onReorder) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const dragCounter = useRef(0);

  const handleDragStart = useCallback((e, item, index) => {
    setDraggedItem({ item, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.dataTransfer.setData('text/plain', item.id || index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDropTarget(null);
    dragCounter.current = 0;
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e, targetIndex) => {
    e.preventDefault();
    dragCounter.current++;
    setDropTarget(targetIndex);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDropTarget(null);
    }
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.index === dropIndex) {
      return;
    }

    const newItems = [...items];
    const draggedElement = newItems.splice(draggedItem.index, 1)[0];
    newItems.splice(dropIndex, 0, draggedElement);

    onReorder(newItems);
    
    setDraggedItem(null);
    setDropTarget(null);
    dragCounter.current = 0;
  }, [items, draggedItem, onReorder]);

  // Generate drag props for draggable items
  const getDragProps = useCallback((item, index) => ({
    draggable: true,
    onDragStart: (e) => handleDragStart(e, item, index),
    onDragEnd: handleDragEnd,
    style: {
      opacity: draggedItem?.index === index ? 0.5 : 1,
      cursor: 'grab'
    }
  }), [draggedItem, handleDragStart, handleDragEnd]);

  // Generate drop props for drop zones
  const getDropProps = useCallback((index) => ({
    onDragOver: handleDragOver,
    onDragEnter: (e) => handleDragEnter(e, index),
    onDragLeave: handleDragLeave,
    onDrop: (e) => handleDrop(e, index),
    style: {
      backgroundColor: dropTarget === index ? '#f0f8ff' : 'transparent',
      border: dropTarget === index ? '2px dashed #007bff' : '2px dashed transparent',
      transition: 'all 0.2s ease'
    }
  }), [dropTarget, handleDragOver, handleDragEnter, handleDragLeave, handleDrop]);

  return {
    getDragProps,
    getDropProps,
    draggedItem,
    dropTarget,
    isDragging: draggedItem !== null
  };
};

export default useModernDragDrop;