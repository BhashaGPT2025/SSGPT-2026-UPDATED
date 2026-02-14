
import React from 'react';
import { type User } from '../types';

type Theme = 'light' | 'dark';

interface SettingsProps {
    user: User;
    theme: Theme;
    toggleTheme: () => void;
    onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, theme, toggleTheme, onLogout }) => {

    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-xl border dark:border-slate-700/50">
                <div className="p-6 border-b dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Manage your preferences and personalize your experience.</p>
                </div>

                <div className="p-6 space-y-8">
                    {/* Profile section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div className="md:col-span-1">
                            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">Profile</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Your account details. The profile picture is from your Google account.
                            </p>
                        </div>
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-4">
                                <img src={user.profilePicture} alt="Profile" className="w-16 h-16 rounded-full" />
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 break-all">{user.email}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Signed in via email/Google.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t dark:border-slate-700"></div>

                    {/* Theme Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">Appearance</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Choose how SSGPT looks. Select a theme that's easy on your eyes.
                            </p>
                        </div>
                        <div className="md:col-span-2">
                             <div className="flex items-center space-x-2 rounded-lg bg-slate-100 dark:bg-slate-700 p-2 max-w-xs">
                                <button
                                    onClick={() => theme !== 'light' && toggleTheme()}
                                    className={`w-full py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
                                        theme === 'light' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    Light
                                </button>
                                <button
                                    onClick={() => theme !== 'dark' && toggleTheme()}
                                    className={`w-full py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
                                        theme === 'dark' ? 'bg-slate-800 shadow text-indigo-400' : 'text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    Dark
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t dark:border-slate-700"></div>

                    {/* Account Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">Account</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                End your current session.
                            </p>
                        </div>
                        <div className="md:col-span-2">
                             <button
                                onClick={onLogout}
                                className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-px"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;