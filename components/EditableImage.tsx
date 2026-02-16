
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { type ImageState } from '../types';

interface EditableImageProps {
  imageState: ImageState;
  onUpdate: (state: ImageState) => void;
  onDelete: (id: string) => void;
  onAiEdit: (id: string, prompt: string) => Promise<void>;
}

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
);
const RotateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const MagicWandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 4V2"/><path d="M15 8V6"/><path d="M12.5 6.5h-1"/><path d="M17.5 6.5h-1"/><path d="m19 2-4.4 4.4"/><path d="m5 2 4.4 4.4"/><path d="M9 22 3 16l4-4 6 6-4 4Z"/><path d="m13.5 6.5 6 6"/></svg>
);

type InteractionType = 'drag' | 'resize' | 'rotate' | null;

const EditableImage: React.FC<EditableImageProps> = ({ imageState, onUpdate, onDelete, onAiEdit }) => {
    const [isSelected, setIsSelected] = useState(false);
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiEditing, setIsAiEditing] = useState(false);

    const elementRef = useRef<HTMLDivElement>(null);
    const interactionRef = useRef<{
        type: InteractionType;
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

    const handleAiEdit = async () => {
        if (!aiPrompt.trim()) return;
        setIsAiEditing(true);
        try {
            await onAiEdit(imageState.id, aiPrompt);
            setIsAiPanelOpen(false);
            setAiPrompt('');
        } catch(e) {
            alert("AI edit failed: " + (e as Error).message);
        } finally {
            setIsAiEditing(false);
        }
    }

    const handleInteractionMove = useCallback((e: MouseEvent) => {
        const { type, handle, startX, startY, startState, imageCenter, startAngle } = interactionRef.current;
        if (!type || !elementRef.current) return;
        
        e.preventDefault();
        e.stopPropagation();

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newState = { ...startState };

        switch (type) {
            case 'drag':
                newState.x += dx;
                newState.y += dy;
                break;
            case 'rotate':
                const currentAngle = Math.atan2(e.clientY - imageCenter.y, e.clientX - imageCenter.x) * (180 / Math.PI);
                newState.rotation = startState.rotation + (currentAngle - startAngle);
                break;
            case 'resize':
                const aspectRatio = startState.width / startState.height;
                if (handle) {
                     if (handle.length > 1) { // Corner resize with aspect ratio lock
                        const widthChange = dx * (handle.includes('l') ? -1 : 1);
                        const newWidth = Math.max(30, startState.width + widthChange);
                        const newHeight = newWidth / aspectRatio;
                        newState.width = newWidth;
                        newState.height = newHeight;
                        if (handle.includes('l')) newState.x = startState.x + (startState.width - newWidth);
                        if (handle.includes('t')) newState.y = startState.y + (startState.height - newHeight);
                    } else { // Edge resize
                        if (handle === 'r') newState.width = Math.max(30, startState.width + dx);
                        if (handle === 'l') { newState.width = Math.max(30, startState.width - dx); newState.x = startState.x + dx; }
                        if (handle === 'b') newState.height = Math.max(30, startState.height + dy);
                        if (handle === 't') { newState.height = Math.max(30, startState.height - dy); newState.y = startState.y + dy; }
                    }
                }
                break;
        }
        
        elementRef.current.style.transform = `translate(${newState.x}px, ${newState.y}px) rotate(${newState.rotation}deg)`;
        elementRef.current.style.width = `${newState.width}px`;
        elementRef.current.style.height = `${newState.height}px`;
    }, []);

    const handleInteractionEnd = useCallback((e: MouseEvent) => {
        window.removeEventListener('mousemove', handleInteractionMove);
        window.removeEventListener('mouseup', handleInteractionEnd);
        
        const { type, handle, startX, startY, startState, imageCenter, startAngle } = interactionRef.current;
        if (!type) return;

        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let finalState = { ...startState };

        switch (type) {
            case 'drag':
                finalState.x += dx;
                finalState.y += dy;
                break;
            case 'rotate':
                const currentAngle = Math.atan2(e.clientY - imageCenter.y, e.clientX - imageCenter.x) * (180 / Math.PI);
                finalState.rotation = startState.rotation + (currentAngle - startAngle);
                break;
            case 'resize':
                 const aspectRatio = startState.width / startState.height;
                 if (handle?.length === 2) {
                     const widthChange = dx * (handle.includes('l') ? -1 : 1);
                     finalState.width = Math.max(30, startState.width + widthChange);
                     finalState.height = finalState.width / aspectRatio;
                     if (handle.includes('l')) finalState.x = startState.x + (startState.width - finalState.width);
                     if (handle.includes('t')) finalState.y = startState.y + (startState.height - finalState.height);
                 } else if (handle) {
                     if (handle === 'r') finalState.width = Math.max(30, startState.width + dx);
                     if (handle === 'l') { finalState.width = Math.max(30, startState.width - dx); finalState.x = startState.x + dx; }
                     if (handle === 'b') finalState.height = Math.max(30, startState.height + dy);
                     if (handle === 't') { finalState.height = Math.max(30, startState.height - dy); finalState.y = startState.y + dy; }
                 }
                break;
        }

        interactionRef.current.type = null;
        onUpdate(finalState);
    }, [onUpdate, handleInteractionMove]);

    const handleInteractionStart = useCallback((e: React.MouseEvent, type: InteractionType, handle = '') => {
        e.preventDefault();
        e.stopPropagation();
        
        const element = elementRef.current;
        if (!element) return;
        
        setIsSelected(true);
        interactionRef.current.type = type;
        interactionRef.current.handle = handle;
        interactionRef.current.startX = e.clientX;
        interactionRef.current.startY = e.clientY;
        interactionRef.current.startState = JSON.parse(JSON.stringify(imageState));

        if (type === 'rotate') {
            const rect = element.getBoundingClientRect();
            interactionRef.current.imageCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            };
            interactionRef.current.startAngle = Math.atan2(
                e.clientY - interactionRef.current.imageCenter.y,
                e.clientX - interactionRef.current.imageCenter.x
            ) * (180 / Math.PI);
        }

        window.addEventListener('mousemove', handleInteractionMove);
        window.addEventListener('mouseup', handleInteractionEnd);
    }, [imageState, handleInteractionMove, handleInteractionEnd]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (elementRef.current && !elementRef.current.contains(event.target as Node)) {
                setIsSelected(false);
                setIsAiPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const resizeHandles = ['tl', 'tr', 'bl', 'br'];
    const cursorMap: { [key: string]: string } = { 'tl': 'nwse-resize', 'tr': 'nesw-resize', 'bl': 'nesw-resize', 'br': 'nwse-resize' };

    return (
        <div
            ref={elementRef}
            tabIndex={0}
            style={{
                position: 'absolute',
                transform: `translate(${imageState.x}px, ${imageState.y}px) rotate(${imageState.rotation}deg)`,
                width: `${imageState.width}px`,
                height: `${imageState.height}px`,
                cursor: 'grab',
                outline: 'none',
                pointerEvents: 'auto',
            }}
            onMouseDown={(e) => handleInteractionStart(e, 'drag')}
            onClick={(e) => {e.stopPropagation(); setIsSelected(true);}}
        >
            <img src={imageState.src} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} alt="" />
            
            {isSelected && (
                <>
                    <div className="absolute inset-0 border-2 border-indigo-500 pointer-events-none"></div>
                    <div className="absolute top-0 flex gap-1.5" style={{ left: '50%', transform: 'translate(-50%, -150%)' }}>
                         <button onClick={(e) => { e.stopPropagation(); setIsAiPanelOpen(p => !p); }} className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-lg"><MagicWandIcon /></button>
                         <button onClick={(e) => { e.stopPropagation(); onDelete(imageState.id); }} className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><TrashIcon /></button>
                    </div>
                    {isAiPanelOpen && (
                        <div className="absolute top-0 flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl" style={{ left: '50%', transform: 'translate(-50%, -280%)' }}>
                            <input type="text" placeholder="e.g., retro look" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiEdit()} className="p-1.5 w-32 text-xs rounded-md bg-transparent border dark:border-slate-700 outline-none" />
                            <button onClick={handleAiEdit} disabled={isAiEditing} className="px-2 bg-purple-600 text-white rounded-md text-xs font-bold">{isAiEditing ? '...' : 'Go'}</button>
                        </div>
                    )}
                    <div className="absolute bottom-0 left-1/2" style={{ transform: 'translate(-50%, 150%)' }}>
                        <div className="w-8 h-8 bg-white text-slate-700 rounded-full flex items-center justify-center shadow-lg cursor-pointer" onMouseDown={(e) => handleInteractionStart(e, 'rotate')}><RotateIcon /></div>
                    </div>
                    {resizeHandles.map(handle => (
                         <div key={handle} className="absolute w-4 h-4 bg-white border-2 border-indigo-500 rounded-full shadow-md" style={{ cursor: cursorMap[handle], top: handle.includes('t') ? '-8px' : 'calc(100% - 8px)', left: handle.includes('l') ? '-8px' : 'calc(100% - 8px)' }} onMouseDown={(e) => handleInteractionStart(e, 'resize', handle)} />
                    ))}
                </>
            )}
        </div>
    );
};
export default EditableImage;
