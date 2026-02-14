
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { type User } from '../types';
import { type User as FirebaseUser } from 'firebase/auth';
import { SSGPT_LOGO_URL } from '../constants';

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
}

const GoogleIcon: React.FC = () => (
    <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.99,36.945,44,30.986,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);

const TeacherIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>;
const StudentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;

const RoleSelectionView: React.FC<{ onRoleSelect: (role: 'teacher' | 'student') => void }> = ({ onRoleSelect }) => (
    <div className="text-center">
        <h2 className="text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">One last step!</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">To personalize your experience, please tell us who you are.</p>
        <div className="mt-8 grid grid-cols-2 gap-4">
            <button onClick={() => onRoleSelect('teacher')} className="p-6 border-2 border-transparent rounded-lg text-center bg-slate-100 dark:bg-slate-700 hover:border-indigo-500 transition-colors">
                <TeacherIcon />
                <span className="font-semibold">I am a Teacher</span>
            </button>
            <button onClick={() => onRoleSelect('student')} className="p-6 border-2 border-transparent rounded-lg text-center bg-slate-100 dark:bg-slate-700 hover:border-indigo-500 transition-colors">
                <StudentIcon />
                <span className="font-semibold">I am a Student</span>
            </button>
        </div>
    </div>
);

interface AuthFormViewProps {
    view: 'login' | 'signup';
    email: string;
    password: string;
    error: string;
    onViewChange: () => void;
    setEmail: (email: string) => void;
    setPassword: (password: string) => void;
    handleSubmit: (e: React.FormEvent) => void;
    handleGoogleSignIn: () => void;
}

const AuthFormView: React.FC<AuthFormViewProps> = ({
    view,
    email,
    password,
    error,
    onViewChange,
    setEmail,
    setPassword,
    handleSubmit,
    handleGoogleSignIn
}) => (
  <>
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
          Email address
        </label>
        <div className="mt-2">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="block w-full rounded-lg border-0 py-2.5 px-3 text-gray-900 dark:text-white bg-white dark:bg-slate-900 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
          Password
        </label>
        <div className="mt-2">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-lg border-0 py-2.5 px-3 text-gray-900 dark:text-white bg-white dark:bg-slate-900 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div>
        <button
          type="submit"
          className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all"
        >
          {view === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </div>
    </form>

    <div className="relative mt-10">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200 dark:border-slate-600" />
        </div>
        <div className="relative flex justify-center text-sm font-medium leading-6">
          <span className="bg-white dark:bg-slate-800 px-6 text-gray-900 dark:text-gray-400">Or continue with</span>
        </div>
      </div>
      
      <div className="mt-6">
          <button
              type="button"
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-white dark:bg-slate-700 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600"
          >
              <GoogleIcon />
              Sign in with Google
          </button>
      </div>

    <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
      {view === 'login' ? "Don't have an account? " : 'Already have an account? '}
      <button onClick={onViewChange} className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
        {view === 'login' ? 'Sign up here' : 'Sign in here'}
      </button>
    </p>
  </>
);


const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [view, setView] = useState<'login' | 'signup' | 'role'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState<FirebaseUser | null>(null);

  const handleGoogleSignIn = async () => {
    setError('');
    try {
        const { user, isNewUser } = await authService.signInWithGoogle();
        if (isNewUser) {
          setNewUser(user);
          setView('role');
        } else {
          // onAuthSuccess will be called by the onAuth listener in App.tsx
        }
    } catch (error: any) {
        setError(error.message || 'Failed to sign in with Google.');
    }
  };

  const handleRoleSelect = (role: 'teacher' | 'student') => {
    if (newUser) {
        authService.setUserRole(newUser.uid, role);
        const appUser: User = {
            uid: newUser.uid,
            email: newUser.email!,
            profilePicture: newUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.email?.split('@')[0] || 'User')}&background=random&color=fff&rounded=true`,
            role: role,
        };
        onAuthSuccess(appUser);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    
    try {
        if (view === 'login') {
            await authService.login(email, password);
            // onAuthSuccess will be called by listener in App.tsx
        } else {
            const user = await authService.signup(email, password);
            setNewUser(user);
            setView('role');
        }
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            setError('Invalid credentials. Please try again.');
        } else if (error.code === 'auth/email-already-in-use') {
            setError('An account with this email already exists.');
        } else if (error.code === 'auth/invalid-email') {
            setError('Please enter a valid email address.');
        } else {
            setError(error.message || 'An authentication error occurred.');
        }
    }
  };
  
  const handleViewChange = () => {
      setView(view === 'login' ? 'signup' : 'login');
      setError('');
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-100 dark:bg-gray-900 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
         <div className="flex justify-center items-center gap-2">
            <img src={SSGPT_LOGO_URL} alt="SSGPT Logo" className="w-10 h-10" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">SSGPT</h1>
         </div>
         {view !== 'role' && (
            <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
              {view === 'login' ? 'Sign in to your account' : 'Create an account'}
            </h2>
          )}
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white dark:bg-slate-800 px-6 py-12 shadow-2xl sm:rounded-2xl sm:px-12">
          {view === 'role' ? (
              <RoleSelectionView onRoleSelect={handleRoleSelect} />
          ) : (
              <AuthFormView
                view={view}
                email={email}
                password={password}
                error={error}
                onViewChange={handleViewChange}
                setEmail={setEmail}
                setPassword={setPassword}
                handleSubmit={handleSubmit}
                handleGoogleSignIn={handleGoogleSignIn}
              />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;