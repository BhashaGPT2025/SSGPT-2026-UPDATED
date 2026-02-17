
import React from 'react';
import { type PaperStyles, type WatermarkState, type LogoState } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { ImageIcon } from './icons/ImageIcon';
import { PenIcon } from './icons/PenIcon';

type PaperSize = 'a4' | 'letter';

const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>;
const AlignLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M3 4h18v2H3V4zm0 15h12v2H3v-2zm0-5h18v2H3v-2zm0-5h12v2H3V9z"></path></svg>;
const AlignCenterIcon = (props: React.SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M3 4h18v2H3V4zm3 15h12v2H6v-2zm-3-5h18v2H3v-2zm3-5h12v2H6V9z"></path></svg>;
const AlignRightIcon = (props: React.SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M3 4h18v2H3V4zm6 15h12v2H9v-2zm-6-5h18v2H3v-2zm6-5h12v2H9V9z"></path></svg>;
const NoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M19.78 4.22a.75.75 0 00-1.06-1.06L4.22 18.72a.75.75 0 001.06 1.06L19.78 4.22z"></path><path d="M18.72 4.22a.75.75 0 00-1.06 1.06L2.22 19.78a.75.75 0 001.06-1.06L18.72 4.22z"></path></svg>;

interface EditorSidebarProps {
    styles: PaperStyles;
    onStyleChange: (style: keyof PaperStyles, value: string | number) => void;
    paperSize: PaperSize;
    onPaperSizeChange: (size: PaperSize) => void;
    logo: LogoState;
    watermark: WatermarkState;
    onBrandingUpdate: (updates: Partial<{ logo: LogoState; watermark: WatermarkState }>) => void;
    onOpenImageModal: () => void;
    onUploadImageClick: () => void;
    isAnswerKeyMode?: boolean;
    onToggleShowQuestions?: () => void;
}

const fonts = [ 
    { value: "'Times New Roman', Times, serif", label: 'Times New Roman' }, 
    { value: 'Inter, sans-serif', label: 'Inter (Modern)' }, 
    { value: "'Courier New', Courier, monospace", label: 'Courier New' }, 
];

const borderStyles = [ 
    { value: 'solid', label: 'Solid' }, 
    { value: 'dashed', label: 'Dashed' }, 
    { value: 'dotted', label: 'Dotted' }, 
    { value: 'double', label: 'Double' }, 
];

const logoPositions: { value: LogoState['position']; label: string; icon: React.FC<any> }[] = [
    { value: 'header-left', label: 'Left', icon: AlignLeftIcon },
    { value: 'header-center', label: 'Center', icon: AlignCenterIcon },
    { value: 'header-right', label: 'Right', icon: AlignRightIcon },
    { value: 'none', label: 'None', icon: NoneIcon },
];

const TextControl: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
        <input type="text" value={value} onChange={onChange} className="w-full p-2 text-sm rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
    </div>
);

const ColorControl: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ label, value, onChange }) => (
    <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1 rounded-md border border-slate-200 dark:border-slate-700">
            <input type="color" value={value} onChange={onChange} className="w-6 h-6 p-0 border-none cursor-pointer bg-transparent" />
            <span className="text-xs text-slate-500 font-mono w-14">{value}</span>
        </div>
    </div>
);

const RangeControl: React.FC<{label: string, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, min: number, max: number, step: number, unit?: string}> = ({ label, value, onChange, min, max, step, unit }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
            <span className="text-xs text-slate-500 font-mono">{value}{unit}</span>
        </div>
        <input type="range" value={value} onChange={onChange} min={min} max={max} step={step} className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
    </div>
);

const SelectControl: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: {value: string; label: string}[]}> = ({ label, value, onChange, options }) => (
    <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
        <select value={value} onChange={onChange} className="w-full p-2 text-sm rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

const EditorSidebar: React.FC<EditorSidebarProps> = ({ styles, onStyleChange, paperSize, onPaperSizeChange, logo, watermark, onBrandingUpdate, onOpenImageModal, onUploadImageClick, isAnswerKeyMode, onToggleShowQuestions }) => {
    
    const handleWatermarkUpdate = (updates: Partial<WatermarkState>) => onBrandingUpdate({ watermark: { ...watermark, ...updates } });
    const handleLogoUpdate = (updates: Partial<LogoState>) => onBrandingUpdate({ logo: { ...logo, ...updates } });

    // Preset Handlers
    const setDraftWatermark = () => handleWatermarkUpdate({ 
        type: 'text', 
        text: 'DRAFT', 
        color: '#ff0000', 
        fontSize: 50, 
        opacity: 0.5, 
        rotation: -45 
    });

    const setImagePlaceholderWatermark = () => handleWatermarkUpdate({ 
        type: 'image', 
        src: 'https://placehold.co/400x400/png?text=Confidential', 
        opacity: 0.3, 
        rotation: 0 
    });

    return (
        <div className="p-4 space-y-6 pb-20">
            {/* Top Actions */}
            {!isAnswerKeyMode && (
                <div className="grid grid-cols-2 gap-2">
                    <RibbonButton icon={<UploadIcon className="w-5 h-5"/>} label="Upload Img" onClick={onUploadImageClick} />
                    <RibbonButton icon={<ImageIcon className="w-5 h-5"/>} label="Gen AI Art" onClick={onOpenImageModal} />
                </div>
            )}

            {/* Answer Key Toggle */}
            <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                <label className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Answer Key Mode</label>
                <button 
                    onClick={onToggleShowQuestions}
                    className={`w-10 h-6 rounded-full transition-all relative ${isAnswerKeyMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${isAnswerKeyMode ? 'translate-x-4' : ''}`} />
                </button>
            </div>

            {/* Style Controls */}
            <ControlGroup title="Paper Layout" isOpenDefault>
                <SelectControl label="Size" value={paperSize} onChange={e => onPaperSizeChange(e.target.value as PaperSize)} options={[{value: 'a4', label: 'A4'}, {value: 'letter', label: 'Letter'}]} />
                
                <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 mt-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Border</label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <SelectControl label="Style" value={styles.borderStyle} onChange={e => onStyleChange('borderStyle', e.target.value)} options={borderStyles} />
                        <ColorControl label="Color" value={styles.borderColor} onChange={e => onStyleChange('borderColor', e.target.value)} />
                    </div>
                    <RangeControl label="Width" value={styles.borderWidth} onChange={e => onStyleChange('borderWidth', parseInt(e.target.value))} min={0} max={20} step={1} unit="px" />
                </div>
            </ControlGroup>

            <ControlGroup title="Branding & Watermark">
                {/* Logo Controls */}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Header Logo</label>
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                        {logoPositions.map(({value, icon: Icon}) => (
                            <button key={value} onClick={() => handleLogoUpdate({ position: value })} className={`flex-1 p-2 rounded flex justify-center ${logo.position === value ? 'bg-white dark:bg-slate-600 shadow text-indigo-600' : 'text-slate-400'}`}>
                                <Icon className="w-4 h-4"/>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Watermark Controls */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-2">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Watermark</label>
                        <select 
                            value={watermark.type} 
                            onChange={e => handleWatermarkUpdate({ type: e.target.value as WatermarkState['type'] })}
                            className="text-xs p-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent"
                        >
                            <option value="none">None</option>
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                        </select>
                    </div>

                    {watermark.type !== 'none' && (
                        <div className="space-y-3 animate-fade-in-fast">
                            {/* Preset Buttons */}
                            <div className="flex gap-2 mb-2">
                                <button onClick={setDraftWatermark} className="flex-1 text-[10px] font-bold bg-red-100 text-red-600 py-1 px-2 rounded hover:bg-red-200">Preset: DRAFT</button>
                                <button onClick={setImagePlaceholderWatermark} className="flex-1 text-[10px] font-bold bg-blue-100 text-blue-600 py-1 px-2 rounded hover:bg-blue-200">Preset: Image</button>
                            </div>

                            {watermark.type === 'text' && (
                                <>
                                    <TextControl label="Content" value={watermark.text || ''} onChange={e => handleWatermarkUpdate({ text: e.target.value })} />
                                    <div className="flex gap-2">
                                        <div className="flex-1"><RangeControl label="Size" value={watermark.fontSize} onChange={e => handleWatermarkUpdate({ fontSize: parseInt(e.target.value)})} min={10} max={200} step={5} unit="pt" /></div>
                                        <div className="w-10"><ColorControl label=" " value={watermark.color} onChange={e => handleWatermarkUpdate({ color: e.target.value })} /></div>
                                    </div>
                                </>
                            )}
                            
                            {watermark.type === 'image' && (
                                <TextControl label="Image URL" value={watermark.src || ''} onChange={e => handleWatermarkUpdate({ src: e.target.value })} />
                            )}

                            <RangeControl label="Opacity" value={watermark.opacity} onChange={e => handleWatermarkUpdate({ opacity: parseFloat(e.target.value)})} min={0} max={1} step={0.1} />
                            <RangeControl label="Rotation" value={watermark.rotation} onChange={e => handleWatermarkUpdate({ rotation: parseInt(e.target.value)})} min={-90} max={90} step={15} unit="°" />
                        </div>
                    )}
                </div>
            </ControlGroup>

            <ControlGroup title="Typography">
                <SelectControl label="Font Family" value={styles.fontFamily} onChange={e => onStyleChange('fontFamily', e.target.value)} options={fonts} />
                <ColorControl label="Heading Color" value={styles.headingColor} onChange={e => onStyleChange('headingColor', e.target.value)} />
            </ControlGroup>
        </div>
    );
};

const RibbonButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button 
        onClick={onClick} 
        className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-indigo-100"
    >
        {icon}
        <span className="text-[10px] font-bold mt-1.5">{label}</span>
    </button>
);

const ControlGroup: React.FC<{ title: string; children: React.ReactNode, isOpenDefault?: boolean }> = ({ title, children, isOpenDefault = false }) => ( 
    <details className="control-group group" open={isOpenDefault}>
        <summary className="py-3 cursor-pointer flex justify-between items-center w-full select-none">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{title}</h4>
            <ChevronRightIcon className="chevron w-4 h-4 text-slate-400 transition-transform duration-200"/>
        </summary>
        <div className="pb-4 space-y-4 animate-fade-in-fast pl-1">
            {children}
        </div>
    </details> 
);

export default EditorSidebar;
