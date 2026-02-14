import { auth, googleProvider } from './firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    type User as FirebaseUser
} from 'firebase/auth';
import { type QuestionPaperData, type User, type BankQuestion } from '../types';

// The data will still be in localStorage, but keyed by UID.
// This avoids needing a full backend/database like Firestore for this project.
const DB_KEY = 'ssgpt_firebase_db';

interface UserSettings {
    defaultSchoolName?: string;
    schoolLogo?: string;
    role?: 'teacher' | 'student';
}

interface Database {
    userSettings: Record<string, UserSettings>; // UID -> Settings
    papers: Record<string, QuestionPaperData[]>; // UID -> Teacher's created papers
    attendedPapers: Record<string, QuestionPaperData[]>; // UID -> Student's attended papers
    questionBank: Record<string, BankQuestion[]>; // UID -> BankQuestions
}

const getDb = (): Database => {
    const defaultDb: Database = { userSettings: {}, papers: {}, attendedPapers: {}, questionBank: {} };
    try {
        const dbString = localStorage.getItem(DB_KEY);
        if (dbString) {
            const parsedDb = JSON.parse(dbString);
            return {
                userSettings: parsedDb.userSettings || {},
                papers: parsedDb.papers || {},
                attendedPapers: parsedDb.attendedPapers || {},
                questionBank: parsedDb.questionBank || {},
            };
        }
    } catch (e) {
        console.error("Failed to parse localStorage DB, resetting.", e);
    }
    return defaultDb;
};

const saveDb = (db: Database) => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
};

// Map Firebase User to our App's User type
const mapFirebaseUserToAppUser = (firebaseUser: FirebaseUser, settings: UserSettings | null): User => {
    return {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        profilePicture: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.email?.split('@')[0] || 'User')}&background=random&color=fff&rounded=true`,
        role: settings?.role,
        defaultSchoolName: settings?.defaultSchoolName || '',
        schoolLogo: settings?.schoolLogo
    };
}


export const authService = {
    onAuth(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const db = getDb();
                const userSettings = db.userSettings[firebaseUser.uid] || null;
                const appUser = mapFirebaseUserToAppUser(firebaseUser, userSettings);
                callback(appUser);
            } else {
                callback(null);
            }
        });
    },
    
    async signup(email: string, password: string): Promise<FirebaseUser> {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    },

    async login(email: string, password: string): Promise<User> {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        const db = getDb();
        const userSettings = db.userSettings[firebaseUser.uid] || null;
        return mapFirebaseUserToAppUser(firebaseUser, userSettings);
    },
    
    async signInWithGoogle(): Promise<{user: FirebaseUser, isNewUser: boolean}> {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;
        const db = getDb();
        const isNewUser = !db.userSettings[firebaseUser.uid];
        return { user: firebaseUser, isNewUser };
    },
    
    setUserRole: (uid: string, role: 'teacher' | 'student'): void => {
        const db = getDb();
        db.userSettings[uid] = { ...(db.userSettings[uid] || {}), role };
        saveDb(db);
    },

    async logout(): Promise<void> {
        await signOut(auth);
    },

    getCurrentUserUid: (): string | null => {
        return auth.currentUser ? auth.currentUser.uid : null;
    },
    
    updateUserSettings: (settings: Partial<UserSettings>): User | null => {
        const uid = authService.getCurrentUserUid();
        if (!uid || !auth.currentUser) return null;

        const db = getDb();
        const currentSettings = db.userSettings[uid] || {};
        db.userSettings[uid] = { ...currentSettings, ...settings };
        saveDb(db);
        
        return mapFirebaseUserToAppUser(auth.currentUser, db.userSettings[uid]);
    },

    savePaper: (paper: QuestionPaperData): void => {
        const uid = authService.getCurrentUserUid();
        if (!uid) return;
        
        const db = getDb();
        if (!db.papers[uid]) {
            db.papers[uid] = [];
        }

        const paperIndex = db.papers[uid].findIndex(p => p.id === paper.id);
        if (paperIndex > -1) {
            db.papers[uid][paperIndex] = paper;
        } else {
            db.papers[uid].push(paper);
        }
        saveDb(db);
    },
    
    getPapers: (): QuestionPaperData[] => {
        const uid = authService.getCurrentUserUid();
        if (!uid) return [];
        const db = getDb();
        return (db.papers[uid] || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    deletePaper: (paperId: string): void => {
        const uid = authService.getCurrentUserUid();
        if (!uid) return;

        const db = getDb();
        if (db.papers[uid]) {
            db.papers[uid] = db.papers[uid].filter(p => p.id !== paperId);
            saveDb(db);
        }
    },
    
    // --- Student Attended Papers Methods ---
    saveAttendedPaper: (paper: QuestionPaperData): void => {
        const uid = authService.getCurrentUserUid();
        if (!uid) return;
        
        const db = getDb();
        if (!db.attendedPapers[uid]) {
            db.attendedPapers[uid] = [];
        }

        const paperExists = db.attendedPapers[uid].some(p => p.id === paper.id);
        if (!paperExists) {
            db.attendedPapers[uid].push(paper);
            saveDb(db);
        }
    },

    getAttendedPapers: (): QuestionPaperData[] => {
        const uid = authService.getCurrentUserUid();
        if (!uid) return [];
        const db = getDb();
        return (db.attendedPapers[uid] || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    // --- Question Bank Methods ---

    saveQuestionToBank: (questionData: Omit<BankQuestion, 'id' | 'createdAt'>): BankQuestion => {
        const uid = authService.getCurrentUserUid();
        if (!uid) throw new Error("User not authenticated");
        
        const db = getDb();
        if (!db.questionBank[uid]) {
            db.questionBank[uid] = [];
        }
        
        const newQuestion: BankQuestion = {
            ...questionData,
            id: `q-${Date.now()}`,
            createdAt: new Date().toISOString(),
        };

        db.questionBank[uid].push(newQuestion);
        saveDb(db);
        return newQuestion;
    },

    getQuestionsFromBank: (): BankQuestion[] => {
        const uid = authService.getCurrentUserUid();
        if (!uid) return [];
        const db = getDb();
        return (db.questionBank[uid] || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    updateQuestionInBank: (question: BankQuestion): void => {
        const uid = authService.getCurrentUserUid();
        if (!uid) return;

        const db = getDb();
        if (!db.questionBank[uid]) return;

        const questionIndex = db.questionBank[uid].findIndex(q => q.id === question.id);
        if (questionIndex > -1) {
            db.questionBank[uid][questionIndex] = question;
            saveDb(db);
        }
    },

    deleteQuestionFromBank: (questionId: string): void => {
        const uid = authService.getCurrentUserUid();
        if (!uid) return;

        const db = getDb();
        if (db.questionBank[uid]) {
            db.questionBank[uid] = db.questionBank[uid].filter(q => q.id !== questionId);
            saveDb(db);
        }
    },
};