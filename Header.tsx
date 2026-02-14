
import React, { useState } from 'react';
import { SaveIcon } from './components/icons/SaveIcon';
import { KeyIcon } from './components/icons/KeyIcon';
import { SSGPT_LOGO_URL } from './constants';
import { AnimatedButton } from './components/AnimatedButton';

type Page = 'creationHub' | 'generate' | 'chat' | 'settings' | 'edit' | 'myPapers';

const UndoIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>;
const RedoIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 0 9 9 9 9 0 0 0 6-2.3L21 13"/></svg>;
const ExportIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

interface HeaderProps {
    page: Page;
    onNavigate: (targetPage: Page) => void;
    editorActions?: {
        onSaveAndExit: () => void;
        onExport: () => void;
        onAnswerKey: () => void;
        isSaving?: boolean;
        paperSubject?: string;
        undo: () => void;
        redo: () => void;
        canUndo: boolean;
        canRedo: boolean;
        isAnswerKeyMode?: boolean;
    };
}

const NavItem: React.FC<{label: string, isActive: boolean, onClick: () => void, isMobile?: boolean}> = ({ label, isActive, onClick, isMobile = false }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
        isActive
          ? 'bg-indigo-600 text-white shadow-md'
          : `text-slate-600 dark:text-slate-300 ${isMobile ? 'hover:bg-slate-100 dark:hover:bg-slate-700' : 'hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full'}`
      }`}
    >
      {label}
    </button>
);

const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

const Header: React.FC<HeaderProps> = ({ page, onNavigate, editorActions }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const handleMobileNav = (targetPage: Page) => {
        onNavigate(targetPage);
        setIsMobileMenuOpen(false);
    };

    if (page === 'edit' && editorActions) {
      return (
        <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-700/80 shadow-sm transition-all">
          <div className="max-w-full mx-auto px-3 sm:px-6">
            <div className="flex items-center justify-between h-18 py-2">
              <div className="flex items-center gap-4 overflow-hidden">
                <button 
                    onClick={() => onNavigate('myPapers')} 
                    className="flex-shrink-0 group relative p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Back to Dashboard"
                >
                  <img src={SSGPT_LOGO_URL} alt="SSGPT Logo" className="w-10 h-10 transition-transform duration-500 group-hover:rotate-12" />
                </button>
                
                <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                
                <div className="overflow-hidden flex flex-col justify-center">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[200px] md:max-w-md leading-tight">
                        {editorActions.paperSubject || 'Untitled Paper'}
                    </h1>
                    <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${editorActions.isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                         <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {editorActions.isSaving ? 'Saving changes...' : 'All changes saved'}
                        </p>
                    </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                  {!editorActions.isAnswerKeyMode && (
                      <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={editorActions.undo} 
                            disabled={!editorActions.canUndo} 
                            className="p-2 rounded-full text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-sm" 
                            title="Undo"
                        >
                            <UndoIcon />
                        </button>
                        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                        <button 
                            onClick={editorActions.redo} 
                            disabled={!editorActions.canRedo} 
                            className="p-2 rounded-full text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-sm" 
                            title="Redo"
                        >
                            <RedoIcon />
                        </button>
                      </div>
                  )}

                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="hidden sm:block">
                        <AnimatedButton 
                            icon={editorActions.isAnswerKeyMode ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> : <KeyIcon className="w-5 h-5" />} 
                            label={editorActions.isAnswerKeyMode ? "Back to Paper" : "Answer Key"} 
                            onClick={editorActions.onAnswerKey}
                            variant="glass"
                        />
                    </div>
                    <AnimatedButton 
                        icon={<ExportIcon className="w-5 h-5" />} 
                        label="Export PDF" 
                        onClick={editorActions.onExport}
                        variant="primary"
                    />
                    <AnimatedButton 
                        icon={<SaveIcon className="w-5 h-5" />} 
                        label="Save & Exit" 
                        onClick={editorActions.onSaveAndExit}
                        isLoading={editorActions.isSaving}
                        variant="success"
                    />
                  </div>
              </div>
            </div>
          </div>
        </header>
      );
  }
  
  const navLinks = [
      { label: "Home", page: 'creationHub' as Page, active: page === 'creationHub' },
      { label: "Generator", page: 'generate' as Page, active: page === 'generate' },
      { label: "Chatbot", page: 'chat' as Page, active: page === 'chat' },
      { label: "My Papers", page: 'myPapers' as Page, active: page === 'myPapers' },
      { label: "Settings", page: 'settings' as Page, active: page === 'settings' }
  ];

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-700/80">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button onClick={() => onNavigate('creationHub')} className="flex-shrink-0 flex items-center gap-2 group">
              <img src={SSGPT_LOGO_URL} alt="SSGPT Logo" className="w-8 h-8 transition-transform group-hover:rotate-12" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">SSGPT</span>
            </button>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map(link => (
                <NavItem key={link.page} label={link.label} isActive={link.active} onClick={() => onNavigate(link.page)} />
            ))}
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
                {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
        {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-4 space-y-2 border-b dark:border-slate-700 shadow-lg animate-fade-in-fast">
                 {navLinks.map(link => (
                    <NavItem key={link.page} label={link.label} isActive={link.active} onClick={() => handleMobileNav(link.page)} isMobile={true}/>
                ))}
            </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
