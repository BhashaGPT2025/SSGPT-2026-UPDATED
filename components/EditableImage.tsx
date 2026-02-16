
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { type ImageState } from '../types';

interface EditableImageProps {
  imageState: ImageState;
  onUpdate: (state: ImageState) => void;
  onSelect: () => void;
  isSelected: boolean;
}

const RotateIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);

const EditableImage: React.FC<EditableImageProps> = ({ imageState, onUpdate, onSelect, isSelected }) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const interactionRef = useRef<{
        type: 'drag' | 'resize' | 'rotate' | null;
        handle: string | null;
        startX: number;
        startY: number;
        startState: ImageState;
        imageCenter: { x: number; y: number };
        startAngle: number;
    }>({
        type: null,
        handle: null,
        startX: 0,
        startY: 0,
        startState: imageState,
        imageCenter: { x: 0, y: 0 },
        startAngle: 0,
    });

    const handleMouseDown = useCallback((e: React.MouseEvent, type: 'drag' | 'resize' | 'rotate', handle = '') => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        
        const element = elementRef.current;
        if (!element) return;

        interactionRef.current = {
            type,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startState: { ...imageState },
            imageCenter: { x: 0, y: 0 },
            startAngle: 0
        };

        if (type === 'rotate') {
            const rect = element.getBoundingClientRect();
            interactionRef.current.imageCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            interactionRef.current.startAngle = Math.atan2(e.clientY - interactionRef.current.imageCenter.y, e.clientX - interactionRef.current.imageCenter.x);
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [imageState, onSelect]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const { type, handle, startX, startY, startState, imageCenter, startAngle } = interactionRef.current;
        if (!type) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newState = { ...startState };

        if (type === 'drag') {
            newState.x = startState.x + dx;
            newState.y = startState.y + dy;
        } 
        else if (type === 'resize') {
            const aspectRatio = startState.width / startState.height;
            // Simple resize logic
            if (handle?.includes('r')) newState.width = Math.max(50, startState.width + dx);
            if (handle?.includes('b')) newState.height = Math.max(50, startState.height + dy);
            if (handle?.includes('l')) { 
                const w = Math.max(50, startState.width - dx);
                newState.width = w;
                newState.x = startState.x + (startState.width - w);
            }
            // Maintain aspect ratio for corner handles if needed, simplified here
            if (handle === 'br') {
                newState.width = Math.max(50, startState.width + dx);
                newState.height = newState.width / aspectRatio;
            }
        }
        else if (type === 'rotate') {
            const angle = Math.atan2(e.clientY - imageCenter.y, e.clientX - imageCenter.x);
            const deg = (angle - startAngle) * (180 / Math.PI);
            newState.rotation = (startState.rotation + deg) % 360;
        }

        onUpdate(newState);
    }, [onUpdate]);

    const handleMouseUp = useCallback(() => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        interactionRef.current.type = null;
    }, [handleMouseMove]);

    return (
        <div
            ref={elementRef}
            className="absolute select-none group"
            style={{
                top: 0, left: 0,
                transform: `translate(${imageState.x}px, ${imageState.y}px) rotate(${imageState.rotation}deg)`,
                width: imageState.width,
                height: imageState.height,
                zIndex: isSelected ? 50 : 10,
                cursor: isSelected ? 'move' : 'pointer',
                pointerEvents: 'auto'
            }}
            onMouseDown={(e) => handleMouseDown(e, 'drag')}
        >
            <img 
                src={imageState.src} 
                className="w-full h-full object-contain pointer-events-none" 
                alt="" 
                draggable={false}
            />
            
            {isSelected && (
                <>
                    {/* Border */}
                    <div className="absolute inset-0 border-2 border-indigo-500 pointer-events-none" />
                    
                    {/* Rotate Handle */}
                    <div 
                        className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-indigo-500 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform pointer-events-auto"
                        onMouseDown={(e) => handleMouseDown(e, 'rotate')}
                    >
                        <RotateIcon className="w-3 h-3 text-indigo-600" />
                    </div>

                    {/* Resize Handles */}
                    {['tl', 'tr', 'bl', 'br'].map(h => (
                        <div
                            key={h}
                            className={`absolute w-3 h-3 bg-white border border-indigo-500 rounded-full shadow-sm pointer-events-auto
                                ${h === 'tl' ? '-top-1.5 -left-1.5 cursor-nwse-resize' : ''}
                                ${h === 'tr' ? '-top-1.5 -right-1.5 cursor-nesw-resize' : ''}
                                ${h === 'bl' ? '-bottom-1.5 -left-1.5 cursor-nesw-resize' : ''}
                                ${h === 'br' ? '-bottom-1.5 -right-1.5 cursor-nwse-resize' : ''}
                            `}
                            onMouseDown={(e) => handleMouseDown(e, 'resize', h)}
                        />
                    ))}
                </>
            )}
        </div>
    );
};

export default EditableImage;
