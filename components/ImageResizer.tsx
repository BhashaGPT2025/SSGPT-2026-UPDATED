
import React, { useRef, useEffect } from 'react';
import { ImageState } from '../types'; // Assuming types are stored here

interface ImageResizerProps {
  imageState: ImageState;
  isSelected: boolean;
  onUpdate: (updatedState: Partial<ImageState>) => void;
  children: React.ReactNode;
}

type Direction = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const ImageResizer: React.FC<ImageResizerProps> = ({
  imageState,
  isSelected,
  onUpdate,
  children,
}) => {
  const isResizingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startDimsRef = useRef({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });
  const directionRef = useRef<Direction | null>(null);

  const handleMouseDown = (e: React.MouseEvent, dir: Direction) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = true;
    directionRef.current = dir;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startDimsRef.current = {
      width: imageState.width,
      height: imageState.height,
      x: imageState.x,
      y: imageState.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !directionRef.current) return;

      e.preventDefault();
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      const { width, height, x, y } = startDimsRef.current;
      const dir = directionRef.current;
      const keepRatio = e.shiftKey;
      const aspectRatio = width / height;

      let newWidth = width;
      let newHeight = height;
      let newX = x;
      let newY = y;

      // Calculate simple resizing first
      if (dir.includes('e')) newWidth = width + deltaX;
      if (dir.includes('w')) {
        newWidth = width - deltaX;
        newX = x + deltaX;
      }
      if (dir.includes('s')) newHeight = height + deltaY;
      if (dir.includes('n')) {
        newHeight = height - deltaY;
        newY = y + deltaY;
      }

      // Aspect Ratio Logic (Corner handles only usually)
      if (keepRatio && (dir.length === 2)) {
        if (dir === 'se' || dir === 'nw') {
          // Calculate based on dominant delta or specific logic
          // Here we prioritize width change driving height change
          newHeight = newWidth / aspectRatio;
          // If dragging NW, we also need to adjust Y based on the ratio correction
          if (dir === 'nw') {
             newY = y + (height - newHeight);
          }
        } else if (dir === 'sw' || dir === 'ne') {
           newHeight = newWidth / aspectRatio;
           if (dir === 'ne') {
             newY = y + (height - newHeight);
           }
        }
      }

      // Minimum constraints
      if (newWidth < 20) newWidth = 20;
      if (newHeight < 20) newHeight = 20;

      onUpdate({
        width: newWidth,
        height: newHeight,
        x: newX,
        y: newY,
      });
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        directionRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onUpdate]);

  if (!isSelected) return <>{children}</>;

  const Handle = ({ dir, cursor }: { dir: Direction; cursor: string }) => {
    // Tailwind positioning based on direction
    const posClass = {
      n: 'top-0 left-1/2 -translate-x-1/2 -mt-1.5',
      s: 'bottom-0 left-1/2 -translate-x-1/2 -mb-1.5',
      e: 'right-0 top-1/2 -translate-y-1/2 -mr-1.5',
      w: 'left-0 top-1/2 -translate-y-1/2 -ml-1.5',
      nw: 'top-0 left-0 -mt-1.5 -ml-1.5',
      ne: 'top-0 right-0 -mt-1.5 -mr-1.5',
      sw: 'bottom-0 left-0 -mb-1.5 -ml-1.5',
      se: 'bottom-0 right-0 -mb-1.5 -mr-1.5',
    }[dir];

    return (
      <div
        className={`absolute w-3 h-3 bg-blue-500 border border-white rounded-sm z-50 ${posClass}`}
        style={{ cursor }}
        onMouseDown={(e) => handleMouseDown(e, dir)}
      />
    );
  };

  return (
    <div className="relative w-full h-full group outline outline-2 outline-blue-500">
      {children}
      {/* Corner Handles */}
      <Handle dir="nw" cursor="nw-resize" />
      <Handle dir="ne" cursor="ne-resize" />
      <Handle dir="sw" cursor="sw-resize" />
      <Handle dir="se" cursor="se-resize" />
      {/* Side Handles */}
      <Handle dir="n" cursor="n-resize" />
      <Handle dir="s" cursor="s-resize" />
      <Handle dir="e" cursor="e-resize" />
      <Handle dir="w" cursor="w-resize" />
    </div>
  );
};

export default ImageResizer;
