
import React, { useState, useRef, useEffect } from 'react';
import { SSGPT_LOGO_URL } from '../constants';
import { type Page, type Theme, type User } from '../types';
import { GalleryIcon } from './icons/GalleryIcon';

// Icons
const DashboardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>;
const GenerateIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14h-6.5a2.25 2.25 0 01-2.25-2.25v-6.5A2.25 2.25 0 019.25 3h6.738zM14.5 6a.5.5 0 000-1h-5a.5.5 0 000 1h5zM14.5 8a.5.5 0 000-1h-5a.5.5 0 000 1h5zM11.5 10a.5.5 0 000-1h-2a.5.5 0 000 1h2z" clipRule="evenodd" /><path d="M2 5.25A3.25 3.25 0 015.25 2H12a.75.75 0 010 1.5H5.25A1.75 1.75 0 003.5 5.25v9.5A1.75 1.75 0 005.25 16.5h9.5A1.75 1.75 0 0016.5 14.75V8a.75.75 0 011.5 0v6.75A3.25 3.25 0 0114.75 18h-9.5A3.25 3.25 0 012 14.75v-9.5z" /></svg>;
const ChatIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM2 10a10 10 0 1120 0 10 10 0 01-20 0z" clipRule="evenodd" /><path d="M12.293 6.293a1 1 0 011.414 0l.001.001.001.001a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 9.586l3.293-3.293z" /></svg>;
const PapersIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M2.5 3A1.5 1.5 0 001 4.5v11A1.5 1.5 0 002.5 17h15a1.5 1.5 0 001.5-1.5v-11A1.5 1.5 0 0017.5 3h-15zM2 4.5a.5.5 0 01.5-.5h15a.5.5 0 01.5.5v11a.5.5 0 01-.5.5h-15a.5.5 0 01-.5-.5v-11z" /></svg>;
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M11.49 3.17a.75.75 0 01.51.02.75.75 0 01.444.444.75.75 0 01.02.51v.21a.75.75 0 01-.219.516l-.004.004a.75.75 0 00-.21.492v.006a.75.75 0 00.211.492l.004.004a.75.75 0 01.219.516v.21a.75.75 0 01-.51.02.75.75 0 01-.444.444.75.75 0 01-.51.02h-.21a.75.75 0 01-.516-.219l-.004-.004a.75.75 0 00-.492-.21h-.006a.75.75 0 00-.492.21l-.004.004a.75.75 0 01-.516.219h-.21a.75.75 0 01-.51-.02.75.75 0 01-.444-.444.75.75 0 01-.02-.51v-.21a.75.75 0 01.219-.516l.004-.004a.75.75 0 00.21-.492v-.006a.75.75 0 00-.21-.492l-.004-.004A.75.75 0 013.5 6.09v-.21a.75.75 0 01.51-.02.75.75 0 01.444-.444.75.75 0 01.51-.02h.21a.75.75 0 01.516.219l.004.004a.75.75 0 00.492.21h.006a.75.75 0 00.492-.21l.004-.004a.75.75 0 01.516-.219h.21zM10 8.25a1.75 1.75 0 100 3.5 1.75 1.75 0 000-3.5zM4.26 11.49a.75.75 0 01.02-.51v-.21a.75.75 0 01.219-.516l.004-.004a.75.75 0 00.21-.492v-.006a.75.75 0 00-.21-.492l-.004-.004a.75.75 0 01-.219-.516v-.21a.75.75 0 01.51-.02.75.75 0 01.444-.444.75.75 0 01.51-.02h.21a.75.75 0 01.516.219l.004.004a.75.75 0 00.492.21h.006a.75.75 0 00.492-.21l.004.004a.75.75 0 01.516-.219h.21a.75.75 0 01.51.02.75.75 0 01.444.444.75.75 0 01.02.51v.21a.75.75 0 01-.219.516l-.004.004a.75.75 0 00-.21.492v.006a.75.75 0 00.211.492l.004.004a.75.75 0 01.219.516v.21a.75.75 0 01-.51.02.75.75 0 01-.444.444.75.75 0 01-.02-.51z" clipRule="evenodd" /></svg>;
const LogoutIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2A.75.75 0 0010.75 3.5h-5.5A.75.75 0 004.5 4.25v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" /><path fillRule="evenodd" d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-1.047a.75.75 0 111.06-1.06l2.5 2.5a.75.75 0 010 1.06l-2.5 2.5a.75.75 0 11-1.06-1.06L16.296 10.75H6.75A.75.75 0 016 10z" clipRule="evenodd" /></svg>;
const SunIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const MoonIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const QuestionBankIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M5.5 16.5a1.5 1.5 0 01-1.5-1.5V5.5a1.5 1.5 0 011.5-1.5h9a1.5 1.5 0 011.5 1.5v2.879a.75.75 0 01-1.5 0V5.5a.5.5 0 00-.5-.5h-9a.5.5 0 00-.5.5v9.5a.5.5 0 00.5.5h2.879a.75.75 0 010 1.5H5.5z" /><path d="M14.06 11.56a.75.75 0 01.75-.75h2.44a.75.75 0 010 1.5h-2.44a.75.75 0 01-.75-.75z" /><path d="M14.06 14.56a.75.75 0 01.75-.75h2.44a.75.75 0 010 1.5h-2.44a.75.75 0 01-.75-.75z" /><path d="M11.75 8a.75.75 0 000 1.5h5.5a.75.75 0 000-1.5h-5.5z" /></svg>;
const PracticeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M15.28 2.22a.75.75 0 00-1.06 0l-4.25 4.25a.75.75 0 101.06 1.06L15.25 3.28l4.47 4.47a.75.75 0 101.06-1.06l-5.5-5.5z" clipRule="evenodd" /><path fillRule="evenodd" d="M8.25 3.007a.75.75 0 01.75.75v12.493a.75.75 0 01-1.5 0V3.757a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>;
const AssignedIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M3.5 4A1.5 1.5 0 015 2.5h10A1.5 1.5 0 0116.5 4v10a1.5 1.5 0 01-1.5 1.5H8.691a1.5 1.5 0 00-1.06.44l-1.882 1.882a.75.75 0 01-1.061 0l-1.882-1.882A1.5 1.5 0 002 14V4.5A1.5 1.5 0 013.5 4zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zM10 12a1 1 0 100 2 1 1 0 000-2z" /></svg>;
const AttendedIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>;

interface SidebarProps {
    user: User;
    currentPage: Page;
    onNavigate: (page: Page) => void;
    onLogout: () => void;
    theme: Theme;
    toggleTheme: () => void;
}

const NavItem: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <li>
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
        >
            <span className="w-5 h-5">{icon}</span>
            <span>{label}</span>
        </button>
    </li>
);

const Sidebar: React.FC<SidebarProps> = ({ user, currentPage, onNavigate, onLogout, theme, toggleTheme }) => {
    const teacherLinks = [
        { page: 'teacherDashboard', label: 'Dashboard', icon: <DashboardIcon /> },
        { page: 'generate', label: 'Generate Paper', icon: <GenerateIcon /> },
        { page: 'gallery', label: 'My Uploads', icon: <GalleryIcon /> }, // Added Gallery
        { page: 'questionBank', label: 'Question Bank', icon: <QuestionBankIcon /> },
        { page: 'myPapers', label: 'My Papers', icon: <PapersIcon /> },
        { page: 'chat', label: 'Chatbot', icon: <ChatIcon /> },
    ];

    const studentLinks = [
        { page: 'studentDashboard', label: 'Dashboard', icon: <DashboardIcon /> },
        { page: 'gallery', label: 'My Uploads', icon: <GalleryIcon /> }, // Added Gallery for students too
        { page: 'practice', label: 'Practice Test', icon: <PracticeIcon /> },
        { page: 'assignedPapers', label: 'Assigned Papers', icon: <AssignedIcon /> },
        { page: 'attendedPapers', label: 'Attended Papers', icon: <AttendedIcon /> },
    ];
    
    const navLinks = user.role === 'teacher' ? teacherLinks : studentLinks;

    return (
        <aside className="w-64 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-r border-slate-200/80 dark:border-slate-700/80 flex flex-col p-4 shrink-0 transition-all duration-300">
            <div className="flex items-center gap-2 mb-8">
                <img src={SSGPT_LOGO_URL} alt="SSGPT Logo" className="w-8 h-8" />
                <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">SSGPT</span>
            </div>

            <nav className="flex-1 overflow-y-auto">
                <ul className="space-y-2">
                    {navLinks.map(link => (
                        <NavItem
                            key={link.page}
                            label={link.label}
                            icon={link.icon}
                            isActive={currentPage === link.page}
                            onClick={() => onNavigate(link.page as Page)}
                        />
                    ))}
                </ul>
            </nav>

            <div className="mt-auto">
                 <ul className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                     <NavItem
                        icon={<SettingsIcon />}
                        label="Settings"
                        isActive={currentPage === 'settings'}
                        onClick={() => onNavigate('settings')}
                     />
                    <li>
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        >
                           <LogoutIcon className="w-5 h-5" />
                           <span>Logout</span>
                        </button>
                    </li>
                 </ul>
                 <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg flex items-center justify-between">
                     <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        <img src={user.profilePicture} alt="User" className="w-7 h-7 rounded-full" />
                        <span className="truncate max-w-[100px]">{user.email.split('@')[0]}</span>
                     </div>
                      <button onClick={toggleTheme} className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors" aria-label="Toggle theme">
                        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                    </button>
                 </div>
            </div>
        </aside>
    );
};

export default Sidebar;
