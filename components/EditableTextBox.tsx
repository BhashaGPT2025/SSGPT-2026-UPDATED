
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { type TextBoxState } from '../types';

interface EditableTextBoxProps {
  textBoxState: TextBoxState;
  onUpdate: (state: TextBoxState) => void;
  onDelete: (id: string) => void;
}

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
);
const RotateIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);

type InteractionType = 'drag' | 'resize' | 'rotate' | '';

const useDebouncedCallback = (callback: (...args: any[]) => void, delay: number) => {
    const timeoutRef = useRef<number | null>(null);
    return useCallback((...args: any[]) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
};

const EditableTextBox: React.FC<EditableTextBoxProps> = ({ textBoxState, onUpdate, onDelete }) => {
    const [isSelected, setIsSelected] = useState(false);
    const interactionRef = useRef({
        type: '' as InteractionType,
        handle: '' as string,
        startX: 0,
        startY: 0,
        startState: textBoxState,
        imageCenter: { x: 0, y: 0 },
        startAngle: 0,
    });
    const elementRef = useRef<HTMLDivElement>(null);

    const debouncedOnUpdate = useDebouncedCallback((newState: TextBoxState) => {
        onUpdate(newState);
    }, 500);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        debouncedOnUpdate({ ...textBoxState, htmlContent: e.currentTarget.innerHTML });
    };

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
        interactionRef.current.startState = textBoxState;

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
    }, [textBoxState]);

    const handleInteractionMove = useCallback((e: MouseEvent) => {
        const { type, handle, startX, startY, startState } = interactionRef.current;
        if (!type || !elementRef.current) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let tempState = { ...textBoxState };

        if (type === 'drag') {
            tempState.x = startState.x + dx;
            tempState.y = startState.y + dy;
        } else if (type === 'rotate') {
            const { imageCenter, startAngle } = interactionRef.current;
            const currentAngle = Math.atan2(e.clientY - imageCenter.y, e.clientX - imageCenter.x) * (180 / Math.PI);
            tempState.rotation = startState.rotation + (currentAngle - startAngle);
        } else if (type === 'resize') {
            let newWidth = startState.width;
            let newHeight = startState.height;
            let newX = startState.x;
            let newY = startState.y;

            if (handle.includes('r')) newWidth += dx;
            if (handle.includes('l')) { newWidth -= dx; newX += dx; }
            if (handle.includes('b')) newHeight += dy;
            if (handle.includes('t')) { newHeight -= dy; newY += dy; }
            
            if(newWidth > 30) {
                tempState.width = newWidth;
                tempState.x = newX;
            }
            if(newHeight > 20) {
                tempState.height = newHeight;
                tempState.y = newY;
            }
        }
        
        elementRef.current.style.transform = `translate(${tempState.x}px, ${tempState.y}px) rotate(${tempState.rotation}deg)`;
        elementRef.current.style.width = `${tempState.width}px`;
        elementRef.current.style.height = `${tempState.height}px`;

    }, [textBoxState]);
    
    const handleInteractionEnd = useCallback((e: MouseEvent) => {
        const { type, handle, startX, startY, startState } = interactionRef.current;
        if (!type) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let finalState = { ...startState };

        if (type === 'drag') {
            finalState.x += dx;
            finalState.y += dy;
        } else if (type === 'rotate') {
             const { imageCenter, startAngle } = interactionRef.current;
            const currentAngle = Math.atan2(e.clientY - imageCenter.y, e.clientX - imageCenter.x) * (180 / Math.PI);
            finalState.rotation = startState.rotation + (currentAngle - startAngle);
        } else if (type === 'resize') {
            let newWidth = startState.width;
            let newHeight = startState.height;
            let newX = startState.x;
            let newY = startState.y;

            if (handle.includes('r')) newWidth += dx;
            if (handle.includes('l')) { newWidth -= dx; newX += dx; }
            if (handle.includes('b')) newHeight += dy;
            if (handle.includes('t')) { newHeight -= dy; newY += dy; }
            
            if(newWidth > 30) {
                finalState.width = newWidth;
                finalState.x = newX;
            }
            if(newHeight > 20) {
                finalState.height = newHeight;
                finalState.y = newY;
            }
        }
        
        onUpdate(finalState);
        interactionRef.current.type = '';
    }, [onUpdate]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isSelected) return;
        const target = e.target as HTMLElement;
        const isContentEditable = target.isContentEditable;
        
        // Prevent nudging when user is typing inside the box
        if (isContentEditable && e.key.length === 1) return;

        const nudge = e.shiftKey ? 10 : 1;
        let updatedState = {...textBoxState};
        let changed = false;
        switch (e.key) {
            case 'ArrowUp': if(!isContentEditable) {updatedState.y -= nudge; changed = true;} break;
            case 'ArrowDown': if(!isContentEditable) {updatedState.y += nudge; changed = true;} break;
            case 'ArrowLeft': if(!isContentEditable) {updatedState.x -= nudge; changed = true;} break;
            case 'ArrowRight': if(!isContentEditable) {updatedState.x += nudge; changed = true;} break;
            case 'Delete': case 'Backspace': 
                const selection = window.getSelection();
                if (!isContentEditable || (selection && selection.toString().length > 0)) {
                    // Only delete component if it's selected but not in text-editing mode, or if all text is selected
                    onDelete(textBoxState.id);
                }
                break;
            default: break;
        }
        if (changed) {
            e.preventDefault();
            e.stopPropagation();
            onUpdate(updatedState);
        }
    }, [isSelected, textBoxState, onUpdate, onDelete]);
    
    useEffect(() => {
        const currentType = interactionRef.current.type;
        if (currentType) {
            window.addEventListener('mousemove', handleInteractionMove);
            window.addEventListener('mouseup', handleInteractionEnd, { once: true });
        }
        return () => {
            window.removeEventListener('mousemove', handleInteractionMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
        };
    }, [handleInteractionMove, handleInteractionEnd]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (elementRef.current && !elementRef.current.contains(event.target as Node)) {
                setIsSelected(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const resizeHandles = ['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br'];
    const cursorMap: { [key: string]: string } = {
        'tl': 'nwse-resize', 't': 'ns-resize', 'tr': 'nesw-resize',
        'l': 'ew-resize', 'r': 'ew-resize',
        'bl': 'nesw-resize', 'b': 'ns-resize', 'br': 'nwse-resize',
    };

    return (
        <div
            ref={elementRef}
            tabIndex={0}
            style={{
                position: 'absolute',
                transform: `translate(${textBoxState.x}px, ${textBoxState.y}px) rotate(${textBoxState.rotation}deg)`,
                width: `${textBoxState.width}px`,
                height: `${textBoxState.height}px`,
                cursor: 'grab',
                outline: 'none',
                pointerEvents: 'auto',
            }}
            onMouseDown={(e) => handleInteractionStart(e, 'drag')}
            onClick={(e) => {e.stopPropagation(); setIsSelected(true);}}
            onKeyDown={handleKeyDown}
        >
             <div
                contentEditable
                suppressContentEditableWarning={true}
                dangerouslySetInnerHTML={{ __html: textBoxState.htmlContent }}
                onInput={handleInput}
                onMouseDown={e => {
                    if (interactionRef.current.type === '') {
                        e.stopPropagation();
                    }
                }}
                className="prose dark:prose-invert max-w-none"
                style={{
                    width: '100%',
                    height: '100%',
                    outline: 'none',
                    cursor: 'text',
                    overflowY: 'auto',
                }}
            />
            
            {isSelected && (
                <>
                    <div className="absolute inset-0 border-2 border-indigo-500 pointer-events-none"></div>
                    
                    <div className="absolute top-0 flex gap-1.5" style={{ left: '50%', transform: `translate(-50%, -150%) rotate(${-textBoxState.rotation}deg)`, transformOrigin: 'center bottom' }}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(textBoxState.id); }}
                            onMouseDown={e => e.stopPropagation()}
                            className="w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                            aria-label="Delete text box"
                        >
                            <TrashIcon />
                        </button>
                    </div>

                    <div 
                        className="absolute bottom-0 left-1/2"
                        style={{ transform: `translate(-50%, 150%) rotate(${-textBoxState.rotation}deg)`, transformOrigin: 'center' }}
                    >
                        <div
                            className="w-7 h-7 bg-white text-slate-700 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform"
                            onMouseDown={(e) => handleInteractionStart(e, 'rotate')}
                        >
                            <RotateIcon />
                        </div>
                    </div>
                    
                    {resizeHandles.map(handle => (
                         <div
                            key={handle}
                            className="absolute w-3 h-3 bg-white border-2 border-indigo-500 rounded-full"
                            style={{
                                cursor: cursorMap[handle],
                                top: handle.includes('t') ? '-6px' : handle.includes('b') ? 'calc(100% - 6px)' : 'calc(50% - 6px)',
                                left: handle.includes('l') ? '-6px' : handle.includes('r') ? 'calc(100% - 6px)' : 'calc(50% - 6px)',
                            }}
                            onMouseDown={(e) => handleInteractionStart(e, 'resize', handle)}
                        />
                    ))}
                </>
            )}
        </div>
    );
};
export default EditableTextBox;
