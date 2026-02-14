
import React, { useState } from 'react';

// Icons defined locally for simplicity
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> );
const FacebookIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3l-.5 3h-2.5v6.8c4.56-.93 8-4.96 8-9.8z"></path></svg> );
const TwitterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M22.46 6c-.77.35-1.6.58-2.46.67.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98-3.56-.18-6.73-1.89-8.84-4.48-.37.63-.58 1.37-.58 2.15 0 1.49.76 2.81 1.91 3.56-.71 0-1.37-.22-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.52 8.52 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.45 5.64 21 8.01 21c7.21 0 11.16-5.98 11.16-11.16 0-.17 0-.34-.01-.51.77-.55 1.44-1.23 1.97-2.02z"></path></svg> );
const WhatsAppIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M16.75 13.96c.25.13.43.2.5.28.08.08.13.18.15.25.03.08.03.38-.03.75-.05.38-.33.7-.68.88-.35.18-.75.28-1.2.28-.45 0-.85-.08-1.25-.23-.4-.15-1.2-.5-1.95-1.13-.75-.63-1.38-1.4-1.88-2.33-.5-.93-.75-1.93-.75-3 0-.38.08-.73.23-1.05.15-.33.38-.58.68-.75.3-.18.6-.25.88-.25.28 0 .53.05.75.13.23.08.4.23.55.45.15.23.23.48.28.75.05.28.03.53-.05.75-.08.23-.23.45-.45.68l-.48.48c-.13.13-.23.23-.28.3-.05.08-.08.13-.08.15s.05.15.13.23c.08.08.43.45.95.95.53.5.9.83.98.9.08.08.15.13.23.15.08.03.18.03.25-.03.08-.05.2-.2.38-.38s.3-.28.4-.35c.1-.08.2-.13.3-.13.1 0 .2.03.25.05zM12 2C6.48 2 2 6.48 2 12c0 1.75.45 3.4 1.25 4.85L2 22l5.25-1.38c1.45.78 3.08 1.25 4.75 1.25 5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.5 0-2.95-.38-4.25-1.05l-.3-.18-3.18.83.85-3.1-.2-.33c-.73-1.3-1.15-2.8-1.15-4.3C4.08 7.58 7.63 4 12 4s7.93 3.58 7.93 8c0 4.43-3.55 8-7.93 8z"></path></svg> );
const TelegramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.62 11.95c-.5-.16-.52-.51.11-.75l16.2-6.27c.45-.18.85.13.7.65L18.05 19.1c-.16.51-.5.64-1.03.4L12 16.1l-1.97 1.9c-.18.18-.33.33-.55.35z"></path></svg> );
const EmailIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"></path></svg> );

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  paperTitle: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareUrl, paperTitle }) => {
  const [copySuccess, setCopySuccess] = useState('');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    }, () => {
      setCopySuccess('Failed!');
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(`Check out this question paper: ${paperTitle}`);

  const shareOptions = [
    { name: 'Facebook', icon: <FacebookIcon className="w-6 h-6"/>, url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, color: 'text-blue-600' },
    { name: 'Twitter', icon: <TwitterIcon className="w-6 h-6"/>, url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, color: 'text-sky-500' },
    { name: 'WhatsApp', icon: <WhatsAppIcon className="w-6 h-6"/>, url: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`, color: 'text-green-500' },
    { name: 'Telegram', icon: <TelegramIcon className="w-6 h-6"/>, url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`, color: 'text-sky-400' },
    { name: 'Email', icon: <EmailIcon className="w-6 h-6"/>, url: `mailto:?subject=${encodedTitle}&body=Here is the question paper I created:%20${encodedUrl}`, color: 'text-slate-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Share Paper</h2>
                <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <CloseIcon className="w-5 h-5"/>
                </button>
            </div>
            <div className="p-6">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Share this link via</p>
                <div className="flex justify-around items-center mb-6">
                    {shareOptions.map(opt => (
                        <a key={opt.name} href={opt.url} target="_blank" rel="noopener noreferrer" title={`Share on ${opt.name}`}
                           className={`flex flex-col items-center gap-1.5 ${opt.color} hover:opacity-70 transition-opacity`}>
                            {opt.icon}
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{opt.name}</span>
                        </a>
                    ))}
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Or copy link</p>
                <div className="relative flex items-center">
                    <input type="text" readOnly value={shareUrl} className="w-full bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 rounded-lg pl-3 pr-20 py-2.5 text-sm border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <button onClick={handleCopy} className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 text-sm font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                        {copySuccess || 'Copy'}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ShareModal;
