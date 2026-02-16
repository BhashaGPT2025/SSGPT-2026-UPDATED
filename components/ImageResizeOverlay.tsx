
import React, { useEffect, useState, useRef } from 'react';
import { DeleteIcon } from './icons/DeleteIcon';
import { CropIcon } from './icons/CropIcon';

interface ImageResizeOverlayProps {
    imageElement: HTMLImageElement;
    onDeselect: () => void;
    onEdit: (src: string) => void;
    containerRef: React.RefObject<HTMLDivElement>;
}

export const ImageResizeOverlay: React.FC<ImageResizeOverlayProps> = ({ imageElement, onDeselect, onEdit, containerRef }) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0, top: 0, left: 0 });
    const [hasBorder, setHasBorder] = useState(imageElement.style.border.includes('solid'));

    const updatePosition = () => {
        if (!imageElement || !containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const imgRect = imageElement.getBoundingClientRect();

        setDimensions({
            width: imgRect.width,
            height: imgRect.height,
            top: imgRect.top - containerRect.top + containerRef.current.scrollTop,
            left: imgRect.left - containerRect.left + containerRef.current.scrollLeft
        });
    };

    useEffect(() => {
        updatePosition();
        const interval = setInterval(updatePosition, 100); // Poll for layout shifts
        window.addEventListener('resize', updatePosition);
        containerRef.current?.addEventListener('scroll', updatePosition);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', updatePosition);
            containerRef.current?.removeEventListener('scroll', updatePosition);
        };
    }, [imageElement, containerRef]);

    const handleMouseDown = (e: React.MouseEvent, direction: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.clientX;
        const startWidth = imageElement.offsetWidth;
        const startHeight = imageElement.offsetHeight;
        const aspectRatio = startWidth / startHeight;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            let newWidth = startWidth;
            let newHeight = startHeight;

            if (direction.includes('e')) newWidth = startWidth + deltaX;
            if (direction.includes('w')) newWidth = startWidth - deltaX;
            
            // Maintain aspect ratio
            newHeight = newWidth / aspectRatio;

            if (newWidth > 20) {
                imageElement.style.width = `${newWidth}px`;
                imageElement.style.height = 'auto'; // Let browser calculate height to keep ratio
                updatePosition();
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const toggleBorder = () => {
        if (hasBorder) {
            imageElement.style.border = 'none';
            setHasBorder(false);
        } else {
            imageElement.style.border = '2px solid #000';
            setHasBorder(true);
        }
        updatePosition();
    };

    const handleDelete = () => {
        imageElement.remove();
        onDeselect();
    };

    return (
        <div
            className="absolute pointer-events-none border-2 border-indigo-500 z-50 transition-all duration-75"
            style={{
                width: dimensions.width,
                height: dimensions.height,
                top: dimensions.top,
                left: dimensions.left,
                display: dimensions.width ? 'block' : 'none'
            }}
        >
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-lg shadow-xl flex items-center gap-1 p-1 pointer-events-auto">
                <button onClick={() => onEdit(imageElement.src)} className="p-1.5 hover:bg-slate-700 rounded" title="Crop/Edit">
                    <CropIcon className="w-4 h-4"/>
                </button>
                <div className="w-px h-4 bg-slate-600 mx-1"/>
                <button onClick={toggleBorder} className={`px-2 py-1 text-xs font-semibold rounded hover:bg-slate-700 ${hasBorder ? 'text-indigo-400' : ''}`}>
                    Border
                </button>
                <div className="w-px h-4 bg-slate-600 mx-1"/>
                <button onClick={handleDelete} className="p-1.5 text-red-400 hover:bg-slate-700 rounded" title="Delete">
                    <DeleteIcon className="w-4 h-4"/>
                </button>
            </div>

            {/* Resize Handles */}
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-indigo-500 cursor-nwse-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'se')} />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-indigo-500 cursor-nesw-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'sw')} />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-indigo-500 cursor-nesw-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'ne')} />
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-indigo-500 cursor-nwse-resize pointer-events-auto" onMouseDown={(e) => handleMouseDown(e, 'nw')} />
        </div>
    );
};
