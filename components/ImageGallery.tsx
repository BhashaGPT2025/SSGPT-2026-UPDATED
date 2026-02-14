
import React, { useEffect, useState, useMemo } from 'react';
import { imageService } from '../services/imageService';
import { UploadedImage, GalleryFolder } from '../types';
import { ImageUploadManager } from './ImageUploadManager';
import { DeleteIcon } from './icons/DeleteIcon';
import { EditIcon } from './icons/EditIcon';
import { UploadIcon } from './icons/UploadIcon';

interface ImageGalleryProps {
    onEditImage: (image: UploadedImage) => void;
    isCompact?: boolean;
}

const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" /></svg>;

export const ImageGallery: React.FC<ImageGalleryProps> = ({ onEditImage, isCompact = false }) => {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [folders, setFolders] = useState<GalleryFolder[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof UploadedImage; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
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
                // Get dims
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
        let result = images.filter(img => {
            const matchFolder = selectedFolderId === 'root' ? true : img.folderId === selectedFolderId;
            const matchSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchFolder && matchSearch;
        });

        result.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [images, selectedFolderId, searchTerm, sortConfig]);

    return (
        <div className={`bg-slate-50 dark:bg-slate-950 ${isCompact ? 'p-2' : 'p-6 min-h-screen'} animate-fade-in`}>
            {/* Header Section */}
            <div className="max-w-7xl mx-auto">
                {!isCompact ? (
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">My Uploads</h1>
                            <p className="text-slate-500 dark:text-slate-400">Manage and edit your visual assets.</p>
                        </div>
                        <button 
                            onClick={handleCreateFolder}
                            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
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

                {/* Upload Zone */}
                {!isCompact && <ImageUploadManager onUploadComplete={loadData} />}

                {/* Controls */}
                <div className={`flex flex-col gap-3 mb-4 sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm py-2 z-10 ${isCompact ? '' : 'sm:flex-row'}`}>
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                        <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    <select 
                        value={selectedFolderId} 
                        onChange={e => setSelectedFolderId(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                        <option value="root">All Files</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>

                {/* Images Grid */}
                {filteredImages.length > 0 ? (
                    <div className={`grid gap-3 ${isCompact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'}`}>
                        {filteredImages.map((image) => (
                            <div 
                                key={image.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, image)}
                                className="group relative rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300 cursor-grab active:cursor-grabbing aspect-square"
                            >
                                <img 
                                    src={image.thumbnailUrl} 
                                    alt={image.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                />
                                
                                {/* Overlay Actions */}
                                {!isCompact && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                            <p className="text-white font-semibold text-xs truncate mb-2">{image.name}</p>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => onEditImage(image)}
                                                    className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white py-1.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(image.id)}
                                                    className="bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-md"
                                                >
                                                    <DeleteIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-slate-400 text-sm">No images found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
