import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Move, Grid, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { usePhotoEditor } from '@/hooks/usePhotoEditor';
import { CARD_DIMENSIONS } from '@/types/employee';

interface PhotoEditorProps {
  photo: File;
  onTransformChange: (transform: any) => void;
}

export const PhotoEditor: React.FC<PhotoEditorProps> = ({ photo, onTransformChange }) => {
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
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
  } = usePhotoEditor();

  useEffect(() => {
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    onTransformChange(transform);
  }, [transform, onTransformChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ',':
          handleRotateLeft();
          break;
        case '.':
          handleRotateRight();
          break;
        case '0':
          handleReset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRotateLeft, handleRotateRight, handleReset]);

  const handleScaleChange = (values: number[]) => {
    onTransformChange({ ...transform, scale: values[0] });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-dark-grey">Photo Editor</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
                className={showGrid ? 'bg-clove-orange text-white' : ''}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={snapToCenter}>
                <Target className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Photo Container */}
          <div
            ref={containerRef}
            className="photo-container bg-surface-muted relative border border-card-border rounded-lg overflow-hidden"
            style={{
              width: `${CARD_DIMENSIONS.photoWidth * 96}px`, // 96 DPI for screen
              height: `${CARD_DIMENSIONS.photoHeight * 96}px`,
            }}
            onMouseEnter={() => setShowGrid(true)}
            onMouseLeave={() => setShowGrid(false)}
          >
            {photoUrl && (
              <img
                src={photoUrl}
                alt="Employee photo"
                className={`absolute inset-0 object-cover cursor-${isDragging ? 'grabbing' : 'grab'} select-none`}
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                draggable={false}
              />
            )}
            
            {/* Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 grid-overlay pointer-events-none" />
            )}
            
            {/* Center Guidelines */}
            {showGrid && (
              <>
                <div className="absolute top-0 left-1/2 w-px h-full bg-clove-orange/40 transform -translate-x-px pointer-events-none" />
                <div className="absolute left-0 top-1/2 w-full h-px bg-clove-orange/40 transform -translate-y-px pointer-events-none" />
              </>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <div className="flex-1 px-2">
                <Slider
                  value={[transform.scale]}
                  onValueChange={handleScaleChange}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <span className="text-sm text-dark-grey-lighter min-w-[3rem]">
                {Math.round(transform.scale * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleRotateLeft}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={handleRotateRight}>
                <RotateCw className="w-4 h-4" />
              </Button>
              <div className="flex-1" />
              <Button variant="secondary" size="sm" onClick={handleReset}>
                Reset (0)
              </Button>
            </div>
          </div>

          <div className="text-xs text-dark-grey-lighter space-y-1">
            <p>• Drag photo to reposition</p>
            <p>• Use , and . keys to rotate</p>
            <p>• Press 0 to reset position</p>
          </div>
        </div>
      </Card>
    </div>
  );
};