
import { UploadedImage, GalleryFolder } from '../types';

const STORAGE_KEY_IMAGES = 'ssgpt_gallery_images';
const STORAGE_KEY_FOLDERS = 'ssgpt_gallery_folders';

export const imageService = {
    getImages: (): UploadedImage[] => {
        try {
            const data = localStorage.getItem(STORAGE_KEY_IMAGES);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to load images", e);
            return [];
        }
    },

    saveImage: (image: UploadedImage) => {
        const images = imageService.getImages();
        images.unshift(image); // Add to top
        localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(images));
    },

    deleteImage: (id: string) => {
        const images = imageService.getImages();
        const filtered = images.filter(img => img.id !== id);
        localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(filtered));
    },

    getFolders: (): GalleryFolder[] => {
        try {
            const data = localStorage.getItem(STORAGE_KEY_FOLDERS);
            return data ? JSON.parse(data) : [{ id: 'root', name: 'All Files', parentId: null }];
        } catch (e) {
            return [{ id: 'root', name: 'All Files', parentId: null }];
        }
    },

    createFolder: (name: string) => {
        const folders = imageService.getFolders();
        const newFolder: GalleryFolder = {
            id: `folder-${Date.now()}`,
            name,
            parentId: 'root' // keeping it simple for now
        };
        folders.push(newFolder);
        localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
        return newFolder;
    },

    updateImage: (updatedImage: UploadedImage) => {
        const images = imageService.getImages();
        const index = images.findIndex(img => img.id === updatedImage.id);
        if (index !== -1) {
            images[index] = updatedImage;
            localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(images));
        }
    },

    // Simulated resizing to keep localstorage sane
    compressImage: async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};
