
import React, { useEffect, useState, useMemo } from 'react';
import { imageService } from '../services/imageService';
import { UploadedImage, GalleryFolder } from '../types';
import { ImageUploadManager } from './ImageUploadManager';
import { DeleteIcon } from './icons/DeleteIcon';
import { UploadIcon } from './icons/UploadIcon';

interface ImageGalleryProps {
    onEditImage: (image: UploadedImage) => void;
    onInsertImage?: (imageUrl: string) => void;
    isCompact?: boolean;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ onEditImage, onInsertImage, isCompact = false }) => {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [folders, setFolders] = useState<GalleryFolder[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploadingInCompact, setIsUploadingInCompact] = useState(false);

    const loadData = () => {
        setImages(imageService.getImages());
        setFolders(imageService.getFolders());
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = (id: string) => {
        if (confirm('Are you sure? This cannot be undone.')) {
            imageService.deleteImage(id);
            loadData();
        }
    };

    const handleCreateFolder = () => {
        const name = prompt("Enter folder name:");
        if (name) {
            imageService.createFolder(name);
            loadData();
        }
    };
    
    const handleDragStart = (e: React.DragEvent, image: UploadedImage) => {
        e.dataTransfer.setData('application/json', JSON.stringify(image));
        e.dataTransfer.setData('image/src', image.url); // Standard drag for editor
        e.dataTransfer.effectAllowed = 'copy';
    };
    
    const handleCompactUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        if (files.length === 0) return;
        setIsUploadingInCompact(true);
        
        for (const file of files) {
            try {
                const compressedDataUrl = await imageService.compressImage(file);
                const newImage: UploadedImage = {
                    id: `img-${Date.now()}-${Math.random()}`,
                    name: file.name,
                    url: compressedDataUrl,
                    thumbnailUrl: compressedDataUrl,
                    size: file.size,
                    type: file.type,
                    width: 0, height: 0, folderId: null, createdAt: Date.now(), updatedAt: Date.now(), tags: []
                };
                const img = new Image();
                img.src = compressedDataUrl;
                await new Promise(r => img.onload = r);
                newImage.width = img.width;
                newImage.height = img.height;
                imageService.saveImage(newImage);
            } catch (err) {
                console.error("Upload failed", err);
            }
        }
        setIsUploadingInCompact(false);
        loadData();
        if(e.target) e.target.value = '';
    };

    const filteredImages = useMemo(() => {
        return images.filter(img => {
            const matchFolder = selectedFolderId === 'root' ? true : img.folderId === selectedFolderId;
            const matchSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchFolder && matchSearch;
        });
    }, [images, selectedFolderId, searchTerm]);

    return (
        <div className={`bg-slate-50 dark:bg-slate-950 ${isCompact ? 'p-2' : 'p-6 min-h-screen'} animate-fade-in`}>
            <div className="max-w-7xl mx-auto">
                {!isCompact ? (
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">My Uploads</h1>
                            <p className="text-slate-500 dark:text-slate-400">Manage and edit your visual assets.</p>
                        </div>
                        <button onClick={handleCreateFolder} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            + New Folder
                        </button>
                    </div>
                ) : (
                    <div className="mb-3 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Gallery</h3>
                        <label className="cursor-pointer p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1 text-xs font-semibold">
                            <UploadIcon className="w-3 h-3" />
                            {isUploadingInCompact ? '...' : 'Upload'}
                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleCompactUpload} disabled={isUploadingInCompact} />
                        </label>
                    </div>
                )}

                {!isCompact && <ImageUploadManager onUploadComplete={loadData} />}

                <div className={`flex flex-col gap-3 mb-4 sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm py-2 z-10 ${isCompact ? '' : 'sm:flex-row'}`}>
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                    <select value={selectedFolderId} onChange={e => setSelectedFolderId(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                        <option value="root">All Files</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>

                {filteredImages.length > 0 ? (
                    <div className={`grid gap-3 ${isCompact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'}`}>
                        {filteredImages.map((image) => (
                            <div 
                                key={image.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, image)}
                                onClick={() => onInsertImage && onInsertImage(image.url)}
                                className="group relative rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-95 aspect-square"
                            >
                                <img src={image.thumbnailUrl} alt={image.name} className="w-full h-full object-cover" loading="lazy" />
                                {!isCompact && (
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                        <button onClick={(e) => {e.stopPropagation(); onEditImage(image)}} className="text-white bg-indigo-600 p-2 rounded">Edit</button>
                                        <button onClick={(e) => {e.stopPropagation(); handleDelete(image.id)}} className="text-white bg-red-600 p-2 rounded"><DeleteIcon className="w-4 h-4"/></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-400 text-sm">No images found.</div>
                )}
            </div>
        </div>
    );
};
