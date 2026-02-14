
import React, { useEffect, useRef, useState } from 'react';
import { UploadedImage, EditorState, EditorLayer } from '../types';
import { AnimatedButton } from './AnimatedButton';
import { SaveIcon } from './icons/SaveIcon';
import { LayerIcon } from './icons/LayerIcon';
import { CropIcon } from './icons/CropIcon';
import { SliderIcon } from './icons/SliderIcon';

interface ProImageEditorProps {
    image: UploadedImage | null;
    onClose: () => void;
}

// Helper to load image for canvas
const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
    });
};

export const ProImageEditor: React.FC<ProImageEditorProps> = ({ image, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [editorState, setEditorState] = useState<EditorState>({
        canvasWidth: 800,
        canvasHeight: 600,
        layers: [],
        selectedLayerId: null,
        history: [],
        historyIndex: -1,
        zoom: 1
    });
    
    const [showLayers, setShowLayers] = useState(true);
    const [activeTool, setActiveTool] = useState<'move' | 'crop' | 'filter'>('move');
    const [isRendering, setIsRendering] = useState(false);

    // Init
    useEffect(() => {
        if (image) {
            const init = async () => {
                // Load initial image
                const baseLayer: EditorLayer = {
                    id: 'layer-base',
                    type: 'image',
                    name: 'Background',
                    visible: true,
                    locked: true,
                    x: 0,
                    y: 0,
                    width: image.width || 800,
                    height: image.height || 600,
                    rotation: 0,
                    opacity: 1,
                    src: image.url
                };
                
                // Determine canvas fit
                const maxWidth = window.innerWidth * 0.7;
                const maxHeight = window.innerHeight * 0.8;
                let scale = 1;
                
                if (baseLayer.width > maxWidth || baseLayer.height > maxHeight) {
                    scale = Math.min(maxWidth / baseLayer.width, maxHeight / baseLayer.height);
                }

                setEditorState(prev => ({
                    ...prev,
                    canvasWidth: baseLayer.width,
                    canvasHeight: baseLayer.height,
                    layers: [baseLayer],
                    selectedLayerId: 'layer-base',
                    zoom: scale
                }));
            };
            init();
        }
    }, [image]);

    // Render Loop
    useEffect(() => {
        const render = async () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            setIsRendering(true);

            // Clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Background (Checkerboard)
            const patternSize = 20;
            ctx.fillStyle = '#1e293b'; // slate-800
            ctx.fillRect(0,0, canvas.width, canvas.height);
            
            // Render Layers
            for (const layer of editorState.layers) {
                if (!layer.visible) continue;

                ctx.save();
                
                // Transform
                const centerX = layer.x + layer.width / 2;
                const centerY = layer.y + layer.height / 2;
                
                ctx.translate(centerX, centerY);
                ctx.rotate((layer.rotation * Math.PI) / 180);
                ctx.translate(-centerX, -centerY);
                ctx.globalAlpha = layer.opacity;

                if (layer.filter) ctx.filter = layer.filter;

                if (layer.type === 'image' && layer.src) {
                    const img = await loadImage(layer.src);
                    ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
                }

                // Selection Box
                if (editorState.selectedLayerId === layer.id) {
                    ctx.strokeStyle = '#6366f1'; // Indigo-500
                    ctx.lineWidth = 2 / editorState.zoom; // Keep line width consistent
                    ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
                    
                    // Corners (simplified)
                    ctx.fillStyle = 'white';
                    ctx.fillRect(layer.x - 5, layer.y - 5, 10, 10);
                    ctx.fillRect(layer.x + layer.width - 5, layer.y + layer.height - 5, 10, 10);
                }

                ctx.restore();
            }
            setIsRendering(false);
        };

        requestAnimationFrame(() => render());
    }, [editorState]);

    const handleUpdateLayer = (id: string, updates: Partial<EditorLayer>) => {
        setEditorState(prev => ({
            ...prev,
            layers: prev.layers.map(l => l.id === id ? { ...l, ...updates } : l)
        }));
    };

    if (!image) return null;

    return (
        <div className="fixed inset-0 bg-slate-950 text-white z-[100] flex flex-col animate-fade-in">
            {/* Toolbar */}
            <div className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="text-slate-400 hover:text-white font-semibold">Exit</button>
                    <div className="h-6 w-px bg-slate-700 mx-2" />
                    <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                        <button 
                            onClick={() => setActiveTool('move')}
                            className={`p-2 rounded-md transition-colors ${activeTool === 'move' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                        </button>
                         <button 
                            onClick={() => setActiveTool('crop')}
                            className={`p-2 rounded-md transition-colors ${activeTool === 'crop' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}
                        >
                            <CropIcon className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setActiveTool('filter')}
                            className={`p-2 rounded-md transition-colors ${activeTool === 'filter' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}
                        >
                            <SliderIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <span className="text-slate-500 text-sm">{Math.round(editorState.zoom * 100)}%</span>
                    <AnimatedButton 
                        icon={<SaveIcon className="w-5 h-5" />} 
                        label="Export" 
                        onClick={() => alert("Export logic would go here (canvas.toDataURL)")}
                        variant="success"
                    />
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Canvas Area */}
                <div 
                    ref={containerRef}
                    className="flex-1 bg-slate-900 overflow-auto flex items-center justify-center p-10 relative"
                    onWheel={(e) => {
                        if (e.ctrlKey) {
                            e.preventDefault();
                            setEditorState(s => ({...s, zoom: Math.min(Math.max(0.1, s.zoom - e.deltaY * 0.001), 5) }));
                        }
                    }}
                >
                    <div 
                        className="shadow-2xl shadow-black relative transition-transform duration-75 ease-out"
                        style={{ 
                            width: editorState.canvasWidth, 
                            height: editorState.canvasHeight,
                            transform: `scale(${editorState.zoom})`,
                            transformOrigin: 'center'
                        }}
                    >
                        <canvas 
                            ref={canvasRef}
                            width={editorState.canvasWidth} 
                            height={editorState.canvasHeight}
                            className="block"
                        />
                    </div>
                </div>

                {/* Right Sidebar (Layers & Props) */}
                <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-10">
                    {/* Panel Header */}
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Layers</h3>
                        <button onClick={() => setShowLayers(!showLayers)} className="text-slate-400 hover:text-white">
                            <LayerIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Layers List */}
                    {showLayers && (
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {[...editorState.layers].reverse().map(layer => (
                                <div 
                                    key={layer.id}
                                    onClick={() => setEditorState(s => ({...s, selectedLayerId: layer.id}))}
                                    className={`
                                        p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all
                                        ${editorState.selectedLayerId === layer.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 text-slate-300'}
                                    `}
                                >
                                    <div className="w-4 h-4 rounded-sm border border-current opacity-50" />
                                    <span className="text-sm font-medium truncate flex-1">{layer.name}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleUpdateLayer(layer.id, { visible: !layer.visible }) }}
                                        className={`text-xs opacity-50 hover:opacity-100`}
                                    >
                                        {layer.visible ? '👁️' : '🚫'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Properties Panel */}
                    <div className="border-t border-slate-800 p-4 bg-slate-800/30">
                        <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase">Adjustments</h4>
                        {editorState.selectedLayerId ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 flex justify-between mb-1">
                                        Opacity <span>{Math.round((editorState.layers.find(l=>l.id===editorState.selectedLayerId)?.opacity || 1)*100)}%</span>
                                    </label>
                                    <input 
                                        type="range" min="0" max="1" step="0.01"
                                        value={editorState.layers.find(l=>l.id===editorState.selectedLayerId)?.opacity || 1}
                                        onChange={(e) => handleUpdateLayer(editorState.selectedLayerId!, { opacity: parseFloat(e.target.value) })}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 flex justify-between mb-1">
                                        Rotation <span>{Math.round(editorState.layers.find(l=>l.id===editorState.selectedLayerId)?.rotation || 0)}°</span>
                                    </label>
                                    <input 
                                        type="range" min="-180" max="180" step="1"
                                        value={editorState.layers.find(l=>l.id===editorState.selectedLayerId)?.rotation || 0}
                                        onChange={(e) => handleUpdateLayer(editorState.selectedLayerId!, { rotation: parseInt(e.target.value) })}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-600 text-center py-4">Select a layer to edit</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
