
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/canvasUtils';
import ImageResizer from './ImageResizer';
import { ImageState } from '../types';
import { Area } from 'react-easy-crop/types';

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
  
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // -- Dragging Logic --
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCropMode) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || isCropMode) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      onUpdateImage(imageState.id, {
        x: imageState.x + deltaX,
        y: imageState.y + deltaY,
      });
      
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isCropMode, imageState, onUpdateImage]);


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
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
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
    cursor: isCropMode ? 'default' : 'move',
  };

  return (
    <>
      <div style={style} onMouseDown={handleMouseDown}>
        <ImageResizer
          imageState={imageState}
          isSelected={isSelected && !isCropMode}
          onUpdate={(updates) => onUpdateImage(imageState.id, updates)}
        >
          <div className="relative w-full h-full group">
            <img
              src={imageState.src}
              alt="asset"
              className="w-full h-full object-fill pointer-events-none select-none"
              draggable={false}
            />
            {isSelected && !isCropMode && (
              <div className="absolute -top-10 right-0 flex gap-1 bg-white shadow-lg border border-slate-200 p-1 rounded-md z-50">
                <button
                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                  onMouseDown={(e) => { e.stopPropagation(); setIsCropMode(true); }}
                  title="Crop"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path></svg>
                </button>
                <button
                  className="p-1 hover:bg-red-100 rounded text-red-500"
                  onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            )}
          </div>
        </ImageResizer>
      </div>

      {isCropMode && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-4xl h-[60vh] bg-black border border-slate-700 rounded-xl overflow-hidden">
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
          <div className="flex items-center gap-4 mt-4 bg-white dark:bg-slate-800 p-4 rounded-xl">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500">Zoom</label>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-32" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500">Rotation</label>
              <input type="range" value={rotation} min={0} max={360} step={1} onChange={(e) => setRotation(Number(e.target.value))} className="w-32" />
            </div>
            <div className="w-px h-8 bg-slate-300 mx-2"></div>
            <button onClick={() => setIsCropMode(false)} className="px-4 py-2 bg-slate-200 rounded-lg text-sm font-bold text-slate-700">Cancel</button>
            <button onClick={handleConfirmCrop} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold text-white">Apply</button>
          </div>
        </div>
      )}
    </>
  );
};

export default EditableImage;
