
import React, { useEffect, useState, useRef } from 'react';
import { DeleteIcon } from './icons/DeleteIcon';

interface ImageControlOverlayProps {
    imageElement: HTMLImageElement;
    onDeselect: () => void;
    containerRef: React.RefObject<HTMLDivElement>;
}

export const ImageControlOverlay: React.FC<ImageControlOverlayProps> = ({ imageElement, onDeselect, containerRef }) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0, top: 0, left: 0 });
    const [hasBorder, setHasBorder] = useState(imageElement.style.border.includes('solid'));

    // Sync overlay position with the image element
    const updatePosition = () => {
        if (!imageElement || !containerRef.current) return;
        
        // We need position relative to the container
        const containerRect = containerRef.current.getBoundingClientRect();
        const imgRect = imageElement.getBoundingClientRect();

        setDimensions({
            width: imgRect.width,
            height: imgRect.height,
            top: imgRect.top - containerRect.top,
            left: imgRect.left - containerRect.left
        });
    };

    useEffect(() => {
        updatePosition();
        // Update on scroll or resize
        window.addEventListener('resize', updatePosition);
        const scroller = document.getElementById('editor-scroller');
        scroller?.addEventListener('scroll', updatePosition);
        
        return () => {
            window.removeEventListener('resize', updatePosition);
            scroller?.removeEventListener('scroll', updatePosition);
        };
    }, [imageElement]);

    // --- Resize Logic ---
    const handleMouseDown = (e: React.MouseEvent, direction: 'se' | 'sw' | 'ne' | 'nw') => {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.clientX;
        const startWidth = imageElement.offsetWidth;
        // const startHeight = imageElement.offsetHeight; // Maintain aspect ratio usually implies just setting width for images

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            let newWidth = startWidth;

            if (direction.includes('e')) {
                newWidth = startWidth + deltaX;
            } else {
                newWidth = startWidth - deltaX;
            }

            // Min width constraint
            if (newWidth > 50) {
                imageElement.style.width = `${newWidth}px`;
                imageElement.style.height = 'auto'; // Maintain aspect ratio
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
            imageElement.style.border = '3px solid #000';
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
            ref={overlayRef}
            className="absolute pointer-events-none border-2 border-indigo-500 z-50"
            style={{
                width: dimensions.width,
                height: dimensions.height,
                top: dimensions.top,
                left: dimensions.left,
                display: dimensions.width ? 'block' : 'none' // Hide initially until measured
            }}
        >
            {/* Toolbar */}
            <div className="absolute -top-12 right-0 bg-slate-800 text-white rounded-lg shadow-xl flex items-center gap-1 p-1 pointer-events-auto">
                <button 
                    onClick={toggleBorder} 
                    className={`px-3 py-1.5 text-xs font-semibold rounded hover:bg-slate-700 transition-colors ${hasBorder ? 'bg-indigo-600' : ''}`}
                >
                    Border
                </button>
                <div className="w-px h-4 bg-slate-600 mx-1"/>
                <button 
                    onClick={handleDelete} 
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded"
                    title="Delete Image"
                >
                    <DeleteIcon className="w-4 h-4"/>
                </button>
            </div>

            {/* Resize Handles */}
            {/* Bottom Right */}
            <div 
                className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full cursor-nwse-resize pointer-events-auto shadow-sm"
                onMouseDown={(e) => handleMouseDown(e, 'se')}
            />
            {/* Bottom Left */}
            <div 
                className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full cursor-nesw-resize pointer-events-auto shadow-sm"
                onMouseDown={(e) => handleMouseDown(e, 'sw')}
            />
            {/* Top Right */}
            <div 
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full cursor-nesw-resize pointer-events-auto shadow-sm"
                onMouseDown={(e) => handleMouseDown(e, 'ne')}
            />
            {/* Top Left */}
            <div 
                className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full cursor-nwse-resize pointer-events-auto shadow-sm"
                onMouseDown={(e) => handleMouseDown(e, 'nw')}
            />
        </div>
    );
};

// Keeping the original export pattern to minimize breakage, though unused now.
export const CustomImage = {}; 
export default function EditorImage() { return null; }
