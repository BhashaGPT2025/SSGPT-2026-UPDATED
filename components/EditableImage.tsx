
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/canvasUtils';
import ImageResizer from './ImageResizer';
import { ImageState } from '../types'; 
import { Area } from 'react-easy-crop/types';

interface EditableImageProps {
  imageState: ImageState;
  isSelected: boolean;
  onUpdateImage: (id: string, updates: Partial<ImageState>) => void;
  onClick: () => void;
}

const EditableImage: React.FC<EditableImageProps> = ({
  imageState,
  isSelected,
  onUpdateImage,
  onClick,
}) => {
  // Crop Mode State
  const [isCropMode, setIsCropMode] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Resize Handler - Called continuously during drag
  const handleResize = (updates: Partial<ImageState>) => {
    onUpdateImage(imageState.id, updates);
  };

  // Crop Handlers
  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirmCrop = async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedBase64 = await getCroppedImg(imageState.src, croppedAreaPixels);
      
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

  // Styles for the component on the canvas
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${imageState.x}px`,
    top: `${imageState.y}px`,
    width: `${imageState.width}px`,
    height: `${imageState.height}px`,
    transform: `rotate(${imageState.rotation}deg)`,
    zIndex: isSelected ? 50 : 10,
  };

  return (
    <>
      {/* Main Canvas Element */}
      <div 
        style={style} 
        onMouseDown={onClick}
        className="select-none"
      >
        <ImageResizer
          imageState={imageState}
          isSelected={isSelected}
          onUpdate={handleResize}
        >
          <div className="relative w-full h-full group">
            <img
              src={imageState.src}
              alt="document-asset"
              className="w-full h-full object-fill pointer-events-none select-none"
              draggable={false}
            />
            
            {/* Toolbar appearing on selection (only if not cropping) */}
            {isSelected && !isCropMode && (
              <div className="absolute -top-10 right-0 flex gap-2 bg-white shadow-lg border border-slate-200 p-1 rounded-md z-50">
                <button
                  className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-800 font-semibold transition-colors"
                  onMouseDown={(e) => { e.stopPropagation(); setIsCropMode(true); }}
                >
                  Crop
                </button>
              </div>
            )}
          </div>
        </ImageResizer>
      </div>

      {/* Crop Overlay / Modal */}
      {isCropMode && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-4xl h-[60vh] bg-black border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            <Cropper
              image={imageState.src}
              crop={crop}
              zoom={zoom}
              aspect={undefined} // Free form crop
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          
          <div className="flex items-center gap-6 mt-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border dark:border-slate-700">
            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Zoom</label>
                <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex gap-3">
                <button
                onClick={() => setIsCropMode(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors"
                >
                Cancel
                </button>
                <button
                onClick={handleConfirmCrop}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-bold text-white transition-colors shadow-md"
                >
                Apply Crop
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditableImage;
