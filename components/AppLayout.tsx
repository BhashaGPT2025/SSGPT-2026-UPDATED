import React from 'react';
import Sidebar from './Sidebar';
import { type Page, type Theme, type User } from '../types';

interface AppLayoutProps {
    children: React.ReactNode;
    user: User | null;
    page: Page;
    onNavigate: (page: Page) => void;
    theme: Theme;
    toggleTheme: () => void;
    onLogout: () => void;
    isEditorPage: boolean;
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
    };
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, user, page, onNavigate, theme, toggleTheme, onLogout, isEditorPage, editorActions }) => {
    if (!user) {
        return <>{children}</>;
    }
    
    const getBackgroundColor = () => {
        if (page === 'edit') return 'bg-slate-200 dark:bg-gray-900';
        if (page === 'chat') return 'bg-slate-50 dark:bg-black';
        return 'bg-transparent';
    }

    if (isEditorPage) {
        // Editor has its own layout, we just need the main content
        return children;
    }

    return (
        <div className={`flex min-h-screen ${getBackgroundColor()}`}>
            <Sidebar
                user={user}
                currentPage={page}
                onNavigate={onNavigate}
                onLogout={onLogout}
                theme={theme}
                toggleTheme={toggleTheme}
            />
            <main className="flex-1 overflow-y-auto">
                 <div className={`${page === 'chat' ? 'h-screen' : 'p-4 sm:p-6 lg:p-8'}`}>
                     {children}
                 </div>
            </main>
        </div>
    );
};

export default AppLayout;
