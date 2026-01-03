import { useState, useCallback, useRef } from 'react';
import { PhotoTransform } from '@/types/employee';

export const usePhotoEditor = () => {
  const [transform, setTransform] = useState<PhotoTransform>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleZoomIn = useCallback(() => {
    setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.1, 3) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.1, 0.5) }));
  }, []);

  const handleRotateLeft = useCallback(() => {
    setTransform(prev => ({ ...prev, rotation: prev.rotation - 90 }));
  }, []);

  const handleRotateRight = useCallback(() => {
    setTransform(prev => ({ ...prev, rotation: prev.rotation + 90 }));
  }, []);

  const handleReset = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  }, [transform.x, transform.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;

    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;

    setTransform(prev => ({ ...prev, x: newX, y: newY }));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const snapToCenter = useCallback(() => {
    setTransform(prev => ({ ...prev, x: 0, y: 0 }));
  }, []);

  return {
    transform,
    isDragging,
    showGrid,
    setShowGrid,
    handleZoomIn,
    handleZoomOut,
    handleRotateLeft,
    handleRotateRight,
    handleReset,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    snapToCenter,
  };
};