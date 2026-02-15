import React, { useState, useCallback, useEffect, useRef } from 'react';
import { type Part } from '@google/genai';
import GeneratorForm from './components/GeneratorForm';
import Editor from './components/Editor';
import Loader from './components/Loader';
import ChatbotInterface from './components/ChatbotInterface';
import MyPapers from './components/MyPapers';
import Settings from './components/Settings';
import { type FormData, type QuestionPaperData, type User, type Page, type Theme, UploadedImage } from './types';
import { generateQuestionPaper } from './services/geminiService';
import { generateHtmlFromPaperData } from './services/htmlGenerator';
import { authService } from './services/authService';
import PublicLandingPage from './components/PublicLandingPage';
import AuthPage from './components/AuthPage';
import CreationHub from './components/CreationHub';
import AnalysisScreen from './components/AnalysisScreen';
import AppLayout from './components/AppLayout';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import QuestionBank from './components/QuestionBank';
import PracticeGenerator from './components/PracticeGenerator';
import AssignedPapers from './components/AssignedPapers';
import AttendedPapers from './components/AttendedPapers';
import PublicPaperView from './components/PublicPaperView';
import Header from './Header';
import { ImageGallery } from './components/ImageGallery';
import { ProImageEditor } from './components/ProImageEditor';


function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [page, setPage] = useState<Page>('teacherDashboard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePaper, setActivePaper] = useState<QuestionPaperData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [papers, setPapers] = useState<QuestionPaperData[]>([]);
  const [attendedPapers, setAttendedPapers] = useState<QuestionPaperData[]>([]);
  const [isEditorReady, setEditorReady] = useState<boolean>(false);
  const [authView, setAuthView] = useState<'public' | 'auth'>('public');
  const [textToAnalyze, setTextToAnalyze] = useState<string | null>(null);
  const [imagesToAnalyze, setImagesToAnalyze] = useState<Part[] | null>(null);
  const [publicPaper, setPublicPaper] = useState<QuestionPaperData | null>(null);
  
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<UploadedImage | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('ssgpt-theme') as Theme;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);

    const unsubscribe = authService.onAuth(user => {
      let paperFromHash: QuestionPaperData | null = null;
      if (window.location.hash.startsWith('#paper/')) {
        try {
          const base64String = window.location.hash.substring(7);
          const binaryString = atob(base64String);
          const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
          const jsonString = new TextDecoder().decode(bytes);
          paperFromHash = JSON.parse(jsonString) as QuestionPaperData;
          history.replaceState(null, document.title, window.location.pathname + window.location.search);
        } catch (error) {
          console.error("Failed to load paper from URL hash:", error);
          alert("Internal Error Occurred");
          history.replaceState(null, document.title, window.location.pathname + window.location.search);
        }
      }

      if (user) {
        setCurrentUser(user);
        if (user.role === 'teacher') {
          setPapers(authService.getPapers());
          setPage('teacherDashboard');
        } else if (user.role === 'student') {
          setAttendedPapers(authService.getAttendedPapers());
          setPage('studentDashboard');
        }
        
        if (paperFromHash && user.role === 'student') {
            authService.saveAttendedPaper(paperFromHash);
            setAttendedPapers(authService.getAttendedPapers());
            setActivePaper(paperFromHash);
            setPage('edit');
        } else if (paperFromHash) {
            setPublicPaper(paperFromHash);
        }

      } else {
        setCurrentUser(null);
        setPapers([]);
        setAttendedPapers([]);
        if (paperFromHash) {
          setPublicPaper(paperFromHash);
        }
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const effectiveTheme = (page === 'edit' || page === 'imageEditor') ? 'light' : theme;

  useEffect(() => {
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    if (page !== 'edit' && page !== 'imageEditor') {
      localStorage.setItem('ssgpt-theme', theme);
    }
  }, [effectiveTheme, page, theme]);
  
  const handleLogout = async () => {
      await authService.logout();
      setCurrentUser(null);
      setAuthView('public');
      setPapers([]);
  };
  
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const executeGeneration = async (action: () => Promise<void>) => {
      setIsLoading(true);
      setError(null);

      try {
          await action();
      } catch (e) {
          console.error(e);
          setError('Internal Error Occurred');
      } finally {
          setIsLoading(false);
      }
  };

  const handleGenerate = useCallback((formData: FormData) => {
    setActivePaper(null);
    
    executeGeneration(async () => {
        const paper = await generateQuestionPaper(formData);
        const finalPaper: QuestionPaperData = {
            ...paper,
            schoolLogo: currentUser?.schoolLogo,
            schoolName: formData.schoolName || currentUser?.defaultSchoolName || paper.schoolName,
        };
        setActivePaper(finalPaper);
        if (currentUser?.role === 'teacher') {
            authService.savePaper(finalPaper);
            setPapers(authService.getPapers());
        }
        setPage('edit');
    });

  }, [currentUser]);

  const handleAnalysisComplete = (paper: QuestionPaperData) => {
    setIsLoading(true);
    setError(null);

    const finalPaper: QuestionPaperData = {
        ...paper,
        schoolLogo: currentUser?.schoolLogo,
    };
    
    if (finalPaper.schoolLogo) {
        finalPaper.htmlContent = generateHtmlFromPaperData(finalPaper, {
            logoConfig: { src: finalPaper.schoolLogo, alignment: 'center' }
        });
    }

    setActivePaper(finalPaper);
    if(currentUser?.role === 'teacher') {
      authService.savePaper(finalPaper);
      setPapers(authService.getPapers());
    }
    setPage('edit');
    setTimeout(() => setIsLoading(false), 200);
  };
  
  const handleSavePaper = (editedPaper: QuestionPaperData) => {
      authService.savePaper(editedPaper);
      setActivePaper(editedPaper);
      setPapers(authService.getPapers());
  };
  
  const handleExitEditor = () => {
      setActivePaper(null);
      setPage(currentUser?.role === 'teacher' ? 'myPapers' : 'studentDashboard');
  };
  
  const handleEditPaper = (paper: QuestionPaperData) => {
      setActivePaper(paper);
      setPage('edit');
  };
  
  const handleDeletePaper = (paperId: string) => {
      if(window.confirm("Are you sure you want to delete this paper? This action cannot be undone.")) {
          authService.deletePaper(paperId);
          setPapers(prevPapers => prevPapers.filter(p => p.id !== paperId));
      }
  };

    const handleRenamePaper = (paperId: string, newSubject: string) => {
        const paperToRename = papers.find(p => p.id === paperId);
        if (paperToRename) {
            const updatedPaper = { ...paperToRename, subject: newSubject };
            const logoConfig = paperToRename.schoolLogo ? { src: paperToRename.schoolLogo, alignment: 'center' as const } : undefined;
            updatedPaper.htmlContent = generateHtmlFromPaperData(updatedPaper, { logoConfig });
            authService.savePaper(updatedPaper);
            setPapers(authService.getPapers());
        }
    };

    const handleDuplicatePaper = (paperId: string) => {
        const paperToDuplicate = papers.find(p => p.id === paperId);
        if (paperToDuplicate) {
            const newPaper = {
                ...paperToDuplicate,
                id: `paper-${Date.now()}`,
                subject: `${paperToDuplicate.subject} (Copy)`,
                createdAt: new Date().toISOString(),
            };
            authService.savePaper(newPaper);
            setPapers(authService.getPapers());
        }
    };

    const handleStudentViewPaperFromUrl = (url: string) => {
        if (!url.includes('#paper/')) {
            alert("Internal Error Occurred");
            return;
        }
        try {
            const base64String = url.split('#paper/')[1];
            const binaryString = atob(base64String);
            const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
            const jsonString = new TextDecoder().decode(bytes);
            const paperData = JSON.parse(jsonString) as QuestionPaperData;
            
            authService.saveAttendedPaper(paperData);
            setAttendedPapers(authService.getAttendedPapers());
            setActivePaper(paperData);
            setPage('edit');
        } catch (e) {
            console.error("Failed to process pasted link:", e);
            alert("Internal Error Occurred");
        }
    };
    
    const handleViewAttendedPaper = (paper: QuestionPaperData) => {
        setActivePaper(paper);
        setPage('edit');
    };
    
    const handleEditImage = (image: UploadedImage) => {
        setSelectedImageForEdit(image);
    };

  const handleNavigate = (targetPage: Page) => {
    if (isLoading) return;
    setError(null);
    if (targetPage !== 'edit') {
        setActivePaper(null);
        setEditorReady(false);
    }
    if (targetPage !== 'analyze') {
        setTextToAnalyze(null);
        setImagesToAnalyze(null);
    }
    setPage(targetPage);
  };
  
  const handleStartAnalysis = (text: string) => {
    setTextToAnalyze(text);
    setImagesToAnalyze(null);
    handleNavigate('analyze');
  };
  
  const handleStartImageAnalysis = (images: Part[]) => {
    setImagesToAnalyze(images);
    setTextToAnalyze(null);
    handleNavigate('analyze');
  };
  
  const editorRef = React.useRef<any>(null);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <Loader />
      </div>
    );
  }

  if (publicPaper) {
    return <PublicPaperView paper={publicPaper} onExit={() => setPublicPaper(null)} />;
  }
  
  if (currentUser && !currentUser.role) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (!currentUser) {
    if (authView === 'public') {
      return <PublicLandingPage onGetStarted={() => setAuthView('auth')} />;
    }
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (selectedImageForEdit) {
      return <ProImageEditor image={selectedImageForEdit} onClose={() => setSelectedImageForEdit(null)} />;
  }

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex items-center justify-center flex-1"><Loader /></div>;
    }
    if (error) {
      return (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center max-w-lg mx-auto p-8 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 animate-fade-in-up">
            <h3 className="text-xl font-semibold text-red-500 mb-4">Operation Failed</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 whitespace-pre-wrap">{error}</p>
            <button
              onClick={() => {
                setError(null);
                handleNavigate(currentUser.role === 'teacher' ? 'generate' : 'practice');
              }}
              className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    
    if(currentUser.role === 'teacher') {
        switch (page) {
          case 'teacherDashboard':
            return <TeacherDashboard user={currentUser} papers={papers} onNavigate={handleNavigate} onEditPaper={handleEditPaper} onRenamePaper={handleRenamePaper} onDuplicatePaper={handleDuplicatePaper} onDeletePaper={handleDeletePaper}/>;
          case 'creationHub':
            return <CreationHub onNavigate={handleNavigate} onStartAnalysis={handleStartAnalysis} onStartImageAnalysis={handleStartImageAnalysis} />;
          case 'generate':
            return <GeneratorForm onSubmit={handleGenerate} isLoading={isLoading} user={currentUser} />;
          case 'analyze':
            if (textToAnalyze) return <AnalysisScreen textToAnalyze={textToAnalyze} onComplete={handleAnalysisComplete} onCancel={() => handleNavigate('creationHub')} />;
            if (imagesToAnalyze) return <AnalysisScreen imagesToAnalyze={imagesToAnalyze} onComplete={handleAnalysisComplete} onCancel={() => handleNavigate('creationHub')} />;
            handleNavigate('creationHub'); return null;
          case 'edit':
            if (activePaper) return <Editor ref={editorRef} key={activePaper.id} paperData={activePaper} onSave={handleSavePaper} onSaveAndExit={handleExitEditor} onReady={() => setEditorReady(true)} />;
            handleNavigate('myPapers'); return null;
          case 'myPapers':
            return <MyPapers user={currentUser} papers={papers} onEdit={handleEditPaper} onDelete={handleDeletePaper} onGenerateNew={() => handleNavigate('creationHub')} onRename={handleRenamePaper} onDuplicate={handleDuplicatePaper} />;
          case 'questionBank':
            return <QuestionBank />;
          case 'chat':
            return <ChatbotInterface onGenerate={handleGenerate} />;
          case 'settings':
            return <Settings user={currentUser} theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />;
          case 'gallery':
            return <ImageGallery onEditImage={handleEditImage} />;
          default:
            return <TeacherDashboard user={currentUser} papers={papers} onNavigate={handleNavigate} onEditPaper={handleEditPaper} onRenamePaper={handleRenamePaper} onDuplicatePaper={handleDuplicatePaper} onDeletePaper={handleDeletePaper} />;
        }
    }
    
    if(currentUser.role === 'student') {
        switch (page) {
            case 'studentDashboard':
                return <StudentDashboard user={currentUser} onNavigate={handleNavigate} onViewPaperFromUrl={handleStudentViewPaperFromUrl} />;
            case 'practice':
                return <PracticeGenerator onSubmit={handleGenerate} isLoading={isLoading} user={currentUser} />;
            case 'assignedPapers':
                return <AssignedPapers />;
            case 'attendedPapers':
                return <AttendedPapers papers={attendedPapers} onViewPaper={handleViewAttendedPaper} />;
            case 'edit':
                if (activePaper) return <Editor ref={editorRef} key={activePaper.id} paperData={activePaper} onSave={() => {}} onSaveAndExit={() => handleNavigate('studentDashboard')} onReady={() => setEditorReady(true)} />;
                handleNavigate('studentDashboard'); return null;
            case 'settings':
                return <Settings user={currentUser} theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />;
            case 'gallery':
                return <ImageGallery onEditImage={handleEditImage} />;
            default:
                return <StudentDashboard user={currentUser} onNavigate={handleNavigate} onViewPaperFromUrl={handleStudentViewPaperFromUrl} />;
        }
    }
    
    return <div>Invalid user role.</div>
  };

  const editorActions = (page === 'edit' && editorRef.current) ? {
      onSaveAndExit: editorRef.current.handleSaveAndExitClick,
      onExport: editorRef.current.openExportModal,
      onAnswerKey: editorRef.current.openAnswerKeyModal,
      isSaving: editorRef.current.isSaving,
      paperSubject: activePaper?.subject,
      undo: editorRef.current.undo,
      redo: editorRef.current.redo,
      canUndo: editorRef.current.canUndo,
      canRedo: editorRef.current.canRedo,
      isAnswerKeyMode: editorRef.current.isAnswerKeyMode
  } : undefined;

  const isEditorPage = page === 'edit';

  return (
    <div className={`min-h-screen text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300 ${isEditorPage ? 'flex flex-col h-screen' : ''}`}>
      {isEditorPage && (
          <Header
              page={page}
              onNavigate={handleNavigate}
              editorActions={editorActions} 
          />
      )}
      <AppLayout 
        user={currentUser}
        page={page}
        onNavigate={handleNavigate}
        theme={effectiveTheme}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
        isEditorPage={isEditorPage}
        >
        {renderContent()}
      </AppLayout>
    </div>
  );
}

export default App;