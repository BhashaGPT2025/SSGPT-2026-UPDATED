
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/canvasUtils';
import ImageResizer from './ImageResizer';
import { ImageState } from '../types'; 

// Import react-easy-crop types
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

  // Resize Handler
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
            
            {/* Toolbar appearing on selection */}
            {isSelected && !isCropMode && (
              <div className="absolute -top-10 right-0 flex gap-2 bg-white shadow-md p-1 rounded z-50">
                <button
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-black font-medium transition-colors"
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
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-80 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-4xl h-[60vh] bg-black border border-gray-700 rounded-lg overflow-hidden">
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
          
          <div className="flex gap-4 mt-4 bg-white p-4 rounded shadow-lg">
            <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 mb-1">Zoom</label>
                <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-48 cursor-pointer"
                />
            </div>
            <div className="h-full w-px bg-gray-300 mx-2"></div>
            <button
              onClick={() => setIsCropMode(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCrop}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold text-white transition-colors"
            >
              Apply Crop
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default EditableImage;
