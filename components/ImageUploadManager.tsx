
import React, { useCallback, useState } from 'react';
import { UploadedImage } from '../types';
import { imageService } from '../services/imageService';
import { UploadIcon } from './icons/UploadIcon';

interface ImageUploadManagerProps {
    onUploadComplete: () => void;
}

export const ImageUploadManager: React.FC<ImageUploadManagerProps> = ({ onUploadComplete }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadQueue, setUploadQueue] = useState<{ name: string; progress: number; error?: string }[]>([]);

    const processFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setUploadQueue(prev => [...prev, { name: file.name, progress: 0, error: 'Invalid file type' }]);
            return;
        }

        // Add to queue
        const queueIndex = uploadQueue.length;
        setUploadQueue(prev => [...prev, { name: file.name, progress: 0 }]);

        // Simulate upload progress
        const interval = setInterval(() => {
            setUploadQueue(prev => {
                const newQueue = [...prev];
                if (newQueue[queueIndex]) {
                    newQueue[queueIndex].progress = Math.min(newQueue[queueIndex].progress + 10, 90);
                }
                return newQueue;
            });
        }, 100);

        try {
            const compressedDataUrl = await imageService.compressImage(file);
            
            const newImage: UploadedImage = {
                id: `img-${Date.now()}-${Math.random()}`,
                name: file.name,
                url: compressedDataUrl,
                thumbnailUrl: compressedDataUrl, // In a real app, generate a smaller thumb
                size: file.size,
                type: file.type,
                width: 0, // Would extract from Image object
                height: 0,
                folderId: null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                tags: []
            };

            // Get dims
            const img = new Image();
            img.src = compressedDataUrl;
            await new Promise(r => img.onload = r);
            newImage.width = img.width;
            newImage.height = img.height;

            imageService.saveImage(newImage);

            clearInterval(interval);
            setUploadQueue(prev => {
                const newQueue = [...prev];
                if(newQueue[queueIndex]) newQueue[queueIndex].progress = 100;
                return newQueue;
            });
            
            setTimeout(() => {
                 // Remove from queue after success delay
                 setUploadQueue(prev => prev.filter(item => item.name !== file.name));
                 onUploadComplete();
            }, 1000);

        } catch (e) {
            clearInterval(interval);
            setUploadQueue(prev => {
                const newQueue = [...prev];
                if(newQueue[queueIndex]) {
                    newQueue[queueIndex].progress = 0;
                    newQueue[queueIndex].error = 'Processing failed';
                }
                return newQueue;
            });
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        files.forEach(processFile);
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(processFile);
        if(e.target) e.target.value = '';
    };

    return (
        <div className="w-full mb-8 animate-fade-in-up">
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                    relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
                    ${isDragging 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]' 
                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800/50'}
                `}
            >
                <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-indigo-600 dark:text-indigo-400">
                        <UploadIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Drag & Drop images here
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            or <label className="text-indigo-600 hover:text-indigo-500 cursor-pointer font-semibold">
                                browse files
                                <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileInput} />
                            </label>
                        </p>
                    </div>
                    <p className="text-xs text-slate-400">Supports JPG, PNG, WEBP (Max 10MB)</p>
                </div>

                {/* Progress Area */}
                {uploadQueue.length > 0 && (
                    <div className="mt-6 space-y-3">
                        {uploadQueue.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{item.name}</span>
                                        {item.error ? (
                                            <span className="text-red-500">{item.error}</span>
                                        ) : (
                                            <span className="text-slate-500">{item.progress}%</span>
                                        )}
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-300 ${item.error ? 'bg-red-500' : 'bg-indigo-500'}`}
                                            style={{ width: `${item.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
