
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/canvasUtils';
import { ImageState } from '../types';
import { Area } from 'react-easy-crop/types';

// --- Custom Hook for Resizing & Moving ---
const useResize = (
  imageState: ImageState,
  onUpdate: (id: string, updates: Partial<ImageState>) => void,
  isSelected: boolean
) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const interactionRef = useRef({
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startXPos: 0,
    startYPos: 0,
    direction: '',
  });

  const handleMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
    if (!isSelected) return;
    e.stopPropagation(); // Critical: Stop event from bubbling to parent
    e.preventDefault(); // Prevent default browser drag behavior

    const { clientX, clientY } = e;
    interactionRef.current = {
      startX: clientX,
      startY: clientY,
      startWidth: imageState.width,
      startHeight: imageState.height,
      startXPos: imageState.x,
      startYPos: imageState.y,
      direction,
    };

    if (direction === 'move') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }
  }, [isSelected, imageState]);

  useEffect(() => {
    if (!isResizing && !isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const { clientX, clientY } = e;
      const { startX, startY, startWidth, startHeight, startXPos, startYPos, direction } = interactionRef.current;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startXPos;
      let newY = startYPos;

      if (direction === 'move') {
        newX = startXPos + deltaX;
        newY = startYPos + deltaY;
      } else {
        if (direction.includes('e')) newWidth = Math.max(30, startWidth + deltaX);
        if (direction.includes('w')) {
          newWidth = Math.max(30, startWidth - deltaX);
          newX = startXPos + (startWidth - newWidth);
        }
        if (direction.includes('s')) newHeight = Math.max(30, startHeight + deltaY);
        if (direction.includes('n')) {
          newHeight = Math.max(30, startHeight - deltaY);
          newY = startYPos + (startHeight - newHeight);
        }
      }

      onUpdate(imageState.id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isDragging, imageState.id, onUpdate]);

  return { handleMouseDown, isResizing, isDragging };
};

// --- Resize Handles UI ---
const ResizeHandles: React.FC<{ onMouseDown: (e: React.MouseEvent, dir: string) => void }> = ({ onMouseDown }) => {
  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  return (
    <>
      {handles.map((dir) => {
        let cursor = 'default';
        let position = {};
        switch (dir) {
          case 'nw': cursor = 'nwse-resize'; position = { top: -6, left: -6 }; break;
          case 'n': cursor = 'ns-resize'; position = { top: -6, left: '50%', transform: 'translateX(-50%)' }; break;
          case 'ne': cursor = 'nesw-resize'; position = { top: -6, right: -6 }; break;
          case 'e': cursor = 'ew-resize'; position = { top: '50%', right: -6, transform: 'translateY(-50%)' }; break;
          case 'se': cursor = 'nwse-resize'; position = { bottom: -6, right: -6 }; break;
          case 's': cursor = 'ns-resize'; position = { bottom: -6, left: '50%', transform: 'translateX(-50%)' }; break;
          case 'sw': cursor = 'nesw-resize'; position = { bottom: -6, left: -6 }; break;
          case 'w': cursor = 'ew-resize'; position = { top: '50%', left: -6, transform: 'translateY(-50%)' }; break;
        }

        return (
          <div
            key={dir}
            onMouseDown={(e) => onMouseDown(e, dir)}
            style={{ ...position, cursor, position: 'absolute' }}
            className="w-3 h-3 bg-white border-2 border-indigo-600 rounded-full z-50 shadow-sm pointer-events-auto hover:scale-125 transition-transform"
          />
        );
      })}
    </>
  );
};

// --- Main Component ---
interface EditableImageProps {
  imageState: ImageState;
  isSelected: boolean;
  onUpdateImage: (id: string, updates: Partial<ImageState>) => void;
  onSelect: () => void;
  onDelete: () => void;
}

const EditableImage: React.FC<EditableImageProps> = ({
  imageState,
  isSelected,
  onUpdateImage,
  onSelect,
  onDelete,
}) => {
  const [isCropMode, setIsCropMode] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Use Custom Hook for Move/Resize
  const { handleMouseDown, isResizing, isDragging } = useResize(imageState, onUpdateImage, isSelected && !isCropMode);

  // -- Crop Logic --
  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirmCrop = async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedBase64 = await getCroppedImg(imageState.src, croppedAreaPixels, rotation);
      onUpdateImage(imageState.id, {
        src: croppedBase64,
      });
      setIsCropMode(false);
    } catch (e) {
      console.error('Cropping failed', e);
    }
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${imageState.x}px`,
    top: `${imageState.y}px`,
    width: `${imageState.width}px`,
    height: `${imageState.height}px`,
    transform: `rotate(${imageState.rotation}deg)`,
    zIndex: isSelected ? 50 : 20,
    touchAction: 'none', 
    cursor: isDragging ? 'grabbing' : 'grab',
    pointerEvents: 'auto', // Ensure the container captures events
  };

  return (
    <>
      <div 
        style={style} 
        onClick={(e) => {
            e.stopPropagation(); // Prevent deselection
            if(!isSelected && !isCropMode) {
                onSelect();
            }
        }}
        onMouseDown={(e) => {
            if(!isCropMode) {
                onSelect();
                handleMouseDown(e, 'move'); 
            }
        }}
        className={`group ${isSelected ? 'ring-2 ring-indigo-600' : 'hover:ring-1 hover:ring-indigo-400'}`}
      >
        <div className="relative w-full h-full">
          <img
            src={imageState.src}
            alt="asset"
            className="w-full h-full object-fill select-none pointer-events-none" 
            draggable={false}
          />
          
          {/* Resize Handles */}
          {isSelected && !isCropMode && (
            <ResizeHandles onMouseDown={handleMouseDown} />
          )}

          {/* Action Toolbar */}
          {isSelected && !isCropMode && !isResizing && !isDragging && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1 bg-white shadow-xl border border-slate-200 p-1.5 rounded-lg z-50 pointer-events-auto" onMouseDown={e => e.stopPropagation()}>
              <button
                className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                onClick={(e) => { e.stopPropagation(); setIsCropMode(true); }}
                title="Crop"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></svg>
              </button>
              <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
              <button
                className="p-1.5 hover:bg-red-50 rounded text-red-500"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {isCropMode && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm" onMouseDown={e => e.stopPropagation()}>
          <div className="relative w-full max-w-4xl h-[60vh] bg-black border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            <Cropper
              image={imageState.src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={undefined}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="flex items-center gap-6 mt-6 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl border dark:border-slate-700">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zoom</label>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-32 accent-indigo-600" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rotation</label>
              <input type="range" value={rotation} min={0} max={360} step={1} onChange={(e) => setRotation(Number(e.target.value))} className="w-32 accent-indigo-600" />
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-600 mx-2"></div>
            <button onClick={() => setIsCropMode(false)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
            <button onClick={handleConfirmCrop} className="px-5 py-2.5 bg-indigo-600 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30">Apply Crop</button>
          </div>
        </div>
      )}
    </>
  );
};

export default EditableImage;
