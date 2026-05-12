import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Presentation, Loader2, Mail, Lock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';

// Components
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { ShareView } from './components/ShareView';
import { Sidebar } from './components/Sidebar';
import { SettingsView } from './components/SettingsView';
import { TemplateStore } from './components/TemplateStore';
import { LandingPage } from './components/LandingPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  // New States (Restored)
  const [activeView, setActiveView] = useState('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/share\/([a-zA-Z0-9]+)/);
    if (match) setShareSlug(match[1]);

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        setIsGuest(false);
        setShowLanding(false);
      }
    });
    return unsub;
  }, []);

  const syncRecent = () => {
    const saved = localStorage.getItem('vivid_recent');
    if (saved) {
      try {
        setRecentProjects(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      setRecentProjects([]);
    }
  };

  // Sync recent projects with localStorage
  useEffect(() => {
    syncRecent();
    window.addEventListener('vivid_recent_updated', syncRecent);
    return () => window.removeEventListener('vivid_recent_updated', syncRecent);
  }, []);

  useEffect(() => {
    const checkDeleted = async () => {
      if (!user) return;
      const saved = localStorage.getItem('vivid_recent');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          let changed = false;
          const valid = [];
          for (const p of parsed) {
            try {
              const { getDoc, doc } = await import('firebase/firestore');
              const snap = await getDoc(doc(db, 'projects', p.id));
              if (snap.exists() && snap.data().isTrashed !== true) {
                valid.push(p);
              } else {
                changed = true;
              }
            } catch (e: any) {
              console.error(e);
              if (e.code === 'permission-denied') {
                changed = true; // Delete it from recent
              } else {
                valid.push(p); // Keep it if offline
              }
            }
          }
          if (changed) {
            localStorage.setItem('vivid_recent', JSON.stringify(valid));
            window.dispatchEvent(new Event('vivid_recent_updated'));
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkDeleted();
  }, [user]);

  const addToRecent = (project: { id: string, title: string }) => {
    const filtered = recentProjects.filter(p => p.id !== project.id);
    const updated = [project, ...filtered].slice(0, 5);
    setRecentProjects(updated);
    localStorage.setItem('vivid_recent', JSON.stringify(updated));
    window.dispatchEvent(new Event('vivid_recent_updated'));
  };

  const handleSelectProject = (id: string, title?: string) => {
    setActiveProject(id);
    if (title) addToRecent({ id, title });
  };

  const login = async () => {
    setShowAuthModal(true);
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
    } catch (e: any) {
      setAuthError(e.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const logout = () => {
    signOut(auth);
    setIsGuest(false);
  };

  const handleExitShare = () => {
    setShareSlug(null);
    window.history.pushState({}, '', '/');
  };

  const renderAuthModal = () => {
    if (!showAuthModal) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`w-full max-w-md rounded-[2rem] p-8 relative z-10 shadow-2xl ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`}
        >
          <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X className={`w-5 h-5 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`} />
          </button>
          
          <h2 className="text-2xl font-black mb-2">{isSignUp ? 'Create an account' : 'Welcome back'}</h2>
          <p className={`mb-8 text-sm ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Sign in to save your presentations and generate with AI.</p>

          <div className="flex flex-col gap-4 mb-6">
            <button 
              onClick={signInWithGoogle}
              className="flex items-center justify-center gap-3 px-8 py-3.5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-bold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all active:scale-95 border border-zinc-200 dark:border-zinc-700 shadow-sm w-full"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className={`h-px flex-1 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
            <span className={`text-xs font-medium ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>OR</span>
            <div className={`h-px flex-1 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
          </div>

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${darkMode ? 'bg-zinc-800/50 border-zinc-800 focus-within:border-violet-500' : 'bg-gray-50 border-gray-200 focus-within:border-violet-400'}`}>
              <Mail className={`w-5 h-5 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
              />
            </div>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${darkMode ? 'bg-zinc-800/50 border-zinc-800 focus-within:border-violet-500' : 'bg-gray-50 border-gray-200 focus-within:border-violet-400'}`}>
              <Lock className={`w-5 h-5 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
              />
            </div>
            
            {authError && <p className="text-red-500 text-xs font-medium">{authError}</p>}
            
            <button 
              type="submit"
              className="w-full mt-2 bg-violet-600 text-white rounded-xl py-3.5 font-bold text-sm shadow-lg hover:bg-violet-700 transition-all active:scale-95"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm font-medium">
            <span className={darkMode ? 'text-zinc-400' : 'text-gray-500'}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button 
              onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
              className="ml-2 text-violet-600 hover:text-violet-500 transition-colors"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </motion.div>
      </div>
    );
  };

  if (shareSlug) {
    return <ShareView slug={shareSlug} onExit={handleExitShare} />;
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-zinc-900' : 'bg-[#FBFBFB]'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (showLanding && !user && !isGuest) {
    return (
      <>
        <LandingPage 
          onLogin={login} 
          onGuest={() => {
            setIsGuest(true);
            setShowLanding(false);
          }} 
          darkMode={darkMode} 
        />
        {renderAuthModal()}
      </>
    );
  }

  if (!user && !isGuest) {
    return (
      <>
        <div className={`flex flex-col items-center justify-center h-screen px-4 text-center ${darkMode ? 'bg-zinc-900' : 'bg-[#FBFBFB]'}`}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md"
          >
            <div className="flex items-center justify-center mb-8">
              <div className="p-3 bg-black rounded-2xl shadow-xl">
                <Presentation className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className={`text-5xl font-semibold tracking-tight mb-4 font-sans ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Vivid
            </h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Create stunning AI presentations in seconds. 
              Real-time streaming, smart layouts, and creative generation.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={login}
                className="w-full flex items-center justify-center gap-3 bg-black text-white px-8 py-4 rounded-2xl font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                Sign In
              </button>
              <button 
                onClick={() => {
                  setIsGuest(true);
                  setShowLanding(false);
                }}
                className={`w-full text-sm font-medium transition-colors py-2 ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-gray-500 hover:text-black'}`}
              >
                Continue as Guest
              </button>
              <button 
                onClick={() => setShowLanding(true)}
                className="text-xs text-zinc-400 hover:underline mt-4"
              >
                Back to landing page
              </button>
            </div>
          </motion.div>
        </div>
        {renderAuthModal()}
      </>
    );
  }

  return (
    <>
      <div className={`min-h-screen flex ${darkMode ? 'bg-zinc-900 text-white dark' : 'bg-[#FBFBFB] text-gray-900'}`}>
      <Sidebar 
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          setActiveProject(null);
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        recentProjects={recentProjects}
        onSelectProject={(id) => handleSelectProject(id)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <div className="flex-1 overflow-auto">
        <main className="max-w-7xl mx-auto p-8">
          <AnimatePresence mode="wait">
            {activeProject ? (
              <Editor 
                key="editor"
                projectId={activeProject} 
                onBack={() => setActiveProject(null)} 
                darkMode={darkMode}
              />
            ) : activeView === 'home' ? (
              <Dashboard 
                key="dashboard"
                onSelectProject={(id, title) => handleSelectProject(id, title)} 
                view="active"
                darkMode={darkMode}
              />
            ) : activeView === 'templates' ? (
              <TemplateStore 
                onSelectProject={(id) => handleSelectProject(id)} 
                darkMode={darkMode}
              />
            ) : activeView === 'trash' ? (
              <Dashboard 
                key="trash"
                onSelectProject={(id, title) => handleSelectProject(id, title)} 
                view="trash"
                darkMode={darkMode}
              />
            ) : (
              <SettingsView darkMode={darkMode} />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
      {renderAuthModal()}
    </>
  );
}
