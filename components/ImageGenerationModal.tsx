import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface ImageGenerationModalProps {
    onClose: () => void;
    onInsertImage: (base64Data: string, width: number, height: number) => void;
    initialPrompt?: string;
}

const LockClosedIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>;
const LockOpenIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5a3 3 0 10-6 0V9h6V5.5A4.5 4.5 0 0010 1z" /></svg>;

const aspectRatios = [ { value: '1:1', label: '1:1' }, { value: '16:9', label: '16:9' }, { value: '9:16', label: '9:16' }, { value: '4:3', label: '4:3' }, { value: '3:4', label: '3:4' }, ] as const;
type AspectRatio = typeof aspectRatios[number]['value'];

const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({ onClose, onInsertImage, initialPrompt }) => {
    const [prompt, setPrompt] = useState(initialPrompt || '');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [imageAR, setImageAR] = useState(1);
    
    const [dimensions, setDimensions] = useState({ width: 300, height: 300 });
    const [lockAspectRatio, setLockAspectRatio] = useState(true);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true); setGeneratedImage(null); setError(null);
        try {
            const imageData = await generateImage(prompt, aspectRatio);
            const img = new Image();
            img.onload = () => { const ar = img.naturalWidth / img.naturalHeight; setImageAR(ar); const defaultWidth = 300; setDimensions({ width: defaultWidth, height: defaultWidth / ar }); };
            img.src = imageData;
            setGeneratedImage(imageData);
        } catch (e) { setError(e instanceof Error ? e.message : 'An unknown error occurred.'); } finally { setIsLoading(false); }
    };
    
    const handleWidthChange = (newWidth: number) => { if (lockAspectRatio) setDimensions({ width: newWidth, height: Math.round(newWidth / imageAR) }); else setDimensions(d => ({ ...d, width: newWidth })); };
    const handleHeightChange = (newHeight: number) => { if (lockAspectRatio) setDimensions({ width: Math.round(newHeight * imageAR), height: newHeight }); else setDimensions(d => ({ ...d, height: newHeight })); };
    const handleInsert = () => { if (generatedImage) { onInsertImage(generatedImage, dimensions.width, dimensions.height); onClose(); } };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">Generate Image with AI</h3>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the image you want to create, e.g., 'A diagram of the human heart with labels.'" className="w-full h-24 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition" disabled={isLoading} />
                <div className="my-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Aspect Ratio</label>
                    <div className="flex gap-2 flex-wrap">
                        {aspectRatios.map(ar => ( <button key={ar.value} onClick={() => setAspectRatio(ar.value)} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${ aspectRatio === ar.value ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}> {ar.label} </button> ))}
                    </div>
                </div>
                <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"> {isLoading ? <><SpinnerIcon className="w-5 h-5" /> Generating...</> : 'Generate Image'} </button>
                {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                <div className="mt-6 min-h-[256px] w-full bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center p-4">
                    {isLoading && <SpinnerIcon className="w-12 h-12 text-indigo-500" />}
                    {generatedImage && <img src={generatedImage} alt={prompt} className="max-h-64 max-w-full object-contain rounded-md" />}
                    {!isLoading && !generatedImage && <p className="text-slate-500">Image preview will appear here</p>}
                </div>
                {generatedImage && ( <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"> <h4 className="text-sm font-semibold mb-2">Image Dimensions (px)</h4> <div className="flex items-center justify-center gap-3"> <DimensionInput label="W" value={dimensions.width} onChange={handleWidthChange} /> <button onClick={() => setLockAspectRatio(l => !l)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400"> {lockAspectRatio ? <LockClosedIcon className="w-5 h-5"/> : <LockOpenIcon className="w-5 h-5"/>} </button> <DimensionInput label="H" value={dimensions.height} onChange={handleHeightChange} /> </div> </div> )}
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"> Cancel </button>
                    <button onClick={handleInsert} disabled={!generatedImage} className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:bg-green-300 transition-colors"> Insert Image </button>
                </div>
            </div>
        </div>
    );
};

const DimensionInput: React.FC<{label: string, value: number, onChange: (val: number) => void}> = ({label, value, onChange}) => ( <div className="relative"> <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">{label}</span> <input type="number" value={Math.round(value)} onChange={e => onChange(parseInt(e.target.value, 10) || 0)} className="w-28 pl-6 pr-2 py-1.5 text-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" /> </div>);

export default ImageGenerationModal;