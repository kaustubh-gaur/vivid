import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Plus, Trash2, Presentation, Loader2, Search, ArrowRight, Sparkles, Filter, MoreVertical, Archive, Palette, Share2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { generatePresentationStructure } from '../services/geminiService';

// Components
import { TemplateStore } from './TemplateStore';

interface Project {
  id: string;
  title: string;
  isTrashed: boolean;
  isDraft?: boolean;
  theme: string;
  updatedAt: any;
}

const STYLE_OPTIONS = [
  'Minimal', 'Night', 'Funky', 'Educational', 'Brutalist', 
  'Editorial', 'Cyberpunk Neon', 'Glassmorphism', 'Minimal Swiss', 
  'Apple Keynote', 'Retro 90s', 'Luxury Black & Gold', 'Anime / Manga', 
  'Futuristic HUD', 'Nature / Organic', 'Editorial Magazine', 'Bauhaus', 
  'Terminal / Hacker', 'Claymorphism', 'Futuristic Minimal White', 
  'Dark Cinematic', 'Scientific / Research', 'Startup Pitch Deck', 
  'Futuristic Gradient Mesh', 'Comic Pop-Art', 'Minimal Monochrome'
];

export function Dashboard({ 
  onSelectProject, 
  view = 'active',
  darkMode = false
}: { 
  onSelectProject: (id: string, title?: string) => void,
  view?: 'active' | 'trash' | 'store',
  darkMode?: boolean
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Minimal');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearTrashModal, setShowClearTrashModal] = useState(false);
  const [isClearingTrash, setIsClearingTrash] = useState(false);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      setProjects([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', auth.currentUser.uid),
      where('isTrashed', '==', view === 'trash'),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const now = new Date().getTime();
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      
      // 7-day automatic pruning
      if (view === 'trash') {
        const filtered = docs.filter(p => {
          const updatedAt = p.updatedAt?.seconds ? p.updatedAt.seconds * 1000 : now;
          const diffDays = (now - updatedAt) / (1000 * 60 * 60 * 24);
          if (diffDays > 7) {
            import('firebase/firestore').then(({ getDocs, collection }) => {
              getDocs(collection(db, `projects/${p.id}/slides`)).then(snap => {
                snap.forEach(s => deleteDoc(doc(db, `projects/${p.id}/slides`, s.id)));
                deleteDoc(doc(db, 'projects', p.id)).catch(console.error);
              });
            });
            return false;
          }
          return true;
        });
        setProjects(filtered);
      } else {
        setProjects(docs);
      }
      
      setLoading(false);
    }, (error) => {
      console.error('Firestore Error:', error);
      setLoading(false);
      toast.error('Failed to load projects');
    });

    return unsub;
  }, [view, auth.currentUser]);

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createAIProject = async () => {
    if (!newTopic) return;
    if (!auth.currentUser) {
      alert('AI generation requires an account. Please sign in to use this feature.');
      await login();
      return;
    }
    setIsCreating(true);
    const toastId = toast.loading('Architecting presentation...');
    try {
      const slides = await generatePresentationStructure(newTopic, selectedStyle);
      
      const projectRef = await addDoc(collection(db, 'projects'), {
        title: newTopic,
        ownerId: auth.currentUser.uid,
        isTrashed: false,
        theme: 'minimal',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.loading(`Drafting ${slides.length} slides...`, { id: toastId });

      // Add slides with a small delay to feel like streaming
      for (const [index, slide] of slides.entries()) {
        const docRef = await addDoc(collection(db, `projects/${projectRef.id}/slides`), {
          projectId: projectRef.id,
          order: index,
          title: slide.title,
          content: slide.content.join('\n'),
          imagePrompt: slide.imagePrompt,
          layout: index === 0 ? 'focus' : 'split'
        });
        toast.loading(`Generating slide ${index + 1}/${slides.length}...`, { id: toastId });
        
        // Auto-generate images in the background
        import('../services/geminiService').then(({ generateSlideImage }) => {
            generateSlideImage(slide.imagePrompt).then(async (url) => {
              if (url) {
                import('../lib/image-utils').then(async ({ compressImage }) => {
                   const compressed = await compressImage(url);
                   await updateDoc(docRef, { imageUrl: compressed });
                });
              }
            });
        });

        await new Promise(r => setTimeout(r, 400));
      }

      toast.success('Presentation ready!', { id: toastId });
      setShowCreateModal(false);
      onSelectProject(projectRef.id, newTopic);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate presentation', { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateBlank = async () => {
    if (!auth.currentUser) {
      onSelectProject('local-guest', 'Guest Presentation');
      return;
    }
    const projectRef = await addDoc(collection(db, 'projects'), {
      title: 'Blank Presentation',
      ownerId: auth.currentUser.uid,
      isTrashed: false,
      theme: 'minimal',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // Create an empty first slide
    await addDoc(collection(db, `projects/${projectRef.id}/slides`), {
      projectId: projectRef.id,
      order: 0,
      title: 'New Slide',
      content: 'Click here to edit content',
      imagePrompt: 'A beautiful creative abstract background'
    });
    onSelectProject(projectRef.id, 'Blank Presentation');
  };
  const removeFromRecent = (id: string) => {
    const saved = localStorage.getItem('vivid_recent');
    if (saved) {
       const filtered = JSON.parse(saved).filter((p:any) => p.id !== id);
       localStorage.setItem('vivid_recent', JSON.stringify(filtered));
       window.dispatchEvent(new Event('vivid_recent_updated'));
    }
  }

  const moveToTrash = async (id: string) => {
    await updateDoc(doc(db, 'projects', id), { isTrashed: true, updatedAt: serverTimestamp() });
    removeFromRecent(id);
  };

  const restoreProject = async (id: string) => {
    await updateDoc(doc(db, 'projects', id), { isTrashed: false, updatedAt: serverTimestamp() });
  };

  const deletePermanently = async (id: string) => {
    if (confirm('Are you sure? This cannot be undone.')) {
      const { getDocs, collection } = await import('firebase/firestore');
      const slidesSnap = await getDocs(collection(db, `projects/${id}/slides`));
      slidesSnap.forEach((s) => {
        deleteDoc(doc(db, `projects/${id}/slides`, s.id));
      });
      await deleteDoc(doc(db, 'projects', id));
      removeFromRecent(id);
    }
  };

  const emptyTrash = async () => {
    setIsClearingTrash(true);
    try {
      const { getDocs, collection } = await import('firebase/firestore');
      const promises = projects.map(async (p) => {
        const slidesSnap = await getDocs(collection(db, `projects/${p.id}/slides`));
        slidesSnap.forEach((s) => {
          deleteDoc(doc(db, `projects/${p.id}/slides`, s.id));
        });
        await deleteDoc(doc(db, 'projects', p.id));
        removeFromRecent(p.id);
      });
      await Promise.all(promises);
      setShowClearTrashModal(false);
      toast.success('Trash emptied');
    } catch (error) {
      console.error(error);
      toast.error('Failed to empty trash');
    } finally {
      setIsClearingTrash(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`space-y-12 ${darkMode ? 'text-white' : 'text-gray-900'}`}
    >
      {/* Minimal Banner */}
      <div className={`relative overflow-hidden rounded-[2rem] p-8 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-black text-white'}`}>
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight mb-4">
            Create with <span className="text-violet-400">Vivid AI</span>
          </h1>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-100 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Generate
            </button>
            <button 
              onClick={handleCreateBlank}
              className="flex items-center gap-2 bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-700 transition-all active:scale-95 border border-white/5"
            >
              <Plus className="w-4 h-4" />
              Blank
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 max-w-md relative group">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${darkMode ? 'text-zinc-400 group-focus-within:text-violet-400' : 'text-gray-500 group-focus-within:text-black'}`} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search presentations..."
            className={`w-full pl-11 pr-4 py-3 rounded-2xl border transition-all text-sm outline-none ${
              darkMode 
                ? 'bg-zinc-800 border-zinc-700 focus:border-violet-500 text-white placeholder:text-zinc-400' 
                : 'bg-white border-zinc-300 focus:border-black text-gray-900 shadow-sm placeholder:text-gray-500 font-medium'
            }`}
          />
        </div>

        <div className="flex items-center gap-4">
          {view === 'trash' ? (
            <div className="flex items-center gap-4">
              <span className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                Items will be deleted after 7 days.
              </span>
              <button 
                onClick={() => setShowClearTrashModal(true)}
                disabled={projects.length === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                  darkMode ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                <Trash2 className="w-5 h-5" />
                Clear Trash
              </button>
            </div>
          ) : (
            <button 
              onClick={async () => {
                if (!auth.currentUser) {
                  // For layout editing as guest
                  onSelectProject('local-guest', 'Guest Presentation');
                  return;
                }
                setShowCreateModal(true);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 ${
                darkMode ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              <Plus className="w-5 h-5" />
              {auth.currentUser ? 'New Project' : 'Quick Start'}
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {view === 'store' ? (
        <TemplateStore onSelectProject={onSelectProject} />
      ) : loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className={`flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl ${darkMode ? 'border-zinc-800 bg-zinc-800/20' : 'border-gray-200 bg-white/50'}`}>
          <div className={`p-4 rounded-full mb-4 ${darkMode ? 'bg-zinc-800' : 'bg-gray-100'}`}>
            <Presentation className={`w-8 h-8 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`} />
          </div>
          <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-zinc-900'}`}>no match</h3>
          <p className={`${darkMode ? 'text-zinc-300' : 'text-zinc-700'} font-medium max-w-xs text-center mt-2`}>
            Try a different search term or start a new project.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
             const now = new Date().getTime();
             const updatedAt = project.updatedAt?.seconds ? project.updatedAt.seconds * 1000 : now;
             const daysLeft = Math.max(0, 7 - Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24)));

             return (
              <motion.div
                layout
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`group relative border rounded-[2.5rem] p-8 transition-all cursor-pointer ${
                  darkMode 
                    ? 'bg-zinc-900 border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800/80 shadow-none' 
                    : 'bg-white border-gray-200 hover:border-black shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]'
                }`}
                onClick={() => view === 'active' && onSelectProject(project.id, project.title)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${view === 'active' ? (darkMode ? 'bg-violet-600 text-white' : 'bg-black text-white') : (darkMode ? 'bg-zinc-700 text-zinc-400' : 'bg-gray-100 text-gray-500')}`}>
                    <Presentation className="w-6 h-6" />
                  </div>
                  {view === 'active' ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); moveToTrash(project.id); }}
                      className={`p-2 opacity-0 group-hover:opacity-100 rounded-full transition-all text-gray-400 hover:text-red-500 ${darkMode ? 'hover:bg-zinc-700' : 'hover:bg-gray-50'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => { e.stopPropagation(); restoreProject(project.id); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-green-600 text-xs font-bold ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Recover
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deletePermanently(project.id); }}
                        className={`p-2 rounded-full text-red-600 ${darkMode ? 'hover:bg-zinc-700' : 'hover:bg-gray-100'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <h4 className={`text-xl font-bold mb-3 truncate transition-colors ${darkMode ? 'text-white' : 'text-zinc-950 group-hover:text-black'}`}>
                  {project.title}
                </h4>
                <div className={`flex items-center justify-between mt-8 pt-5 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-mono uppercase tracking-[0.2em] leading-none mb-1.5 ${darkMode ? 'text-zinc-300' : 'text-zinc-950 font-black'}`}>
                      {project.theme}
                    </span>
                    {view === 'trash' && (
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1">
                        Deletes in {daysLeft} days
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-black tracking-wider uppercase ${darkMode ? 'text-zinc-400' : 'text-zinc-950'}`}>
                    {new Date(project.updatedAt?.seconds * 1000).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
             );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`rounded-[2rem] p-8 w-full max-w-xl shadow-2xl ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-xl ${darkMode ? 'bg-violet-600' : 'bg-black'}`}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Create with AI</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={`text-sm font-medium uppercase tracking-wider mb-2 block ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                    What's your presentation about?
                  </label>
                  <textarea 
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="e.g. The future of sustainable urban farming in 2030..."
                    className={`w-full border rounded-2xl p-4 min-h-[100px] outline-none transition-all ${
                      darkMode 
                        ? 'bg-zinc-800 border-zinc-700 text-white focus:border-violet-500' 
                        : 'bg-gray-50 border-gray-100 focus:ring-2 focus:ring-black'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-sm font-medium uppercase tracking-wider mb-2 block ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Presentation Style
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 pb-4">
                    {STYLE_OPTIONS.map((style) => (
                      <button
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                          selectedStyle === style 
                            ? (darkMode ? 'bg-violet-600 text-white border-violet-500' : 'bg-black text-white border-black')
                            : (darkMode ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    disabled={isCreating}
                    onClick={() => setShowCreateModal(false)}
                    className={`flex-1 px-6 py-4 rounded-2xl font-medium border transition-all ${
                      darkMode ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={isCreating || !newTopic}
                    onClick={createAIProject}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-medium transition-all shadow-lg active:scale-95 ${
                      darkMode ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    {isCreating ? 'Creating Magic...' : 'Generate Slides'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Trash Modal */}
      <AnimatePresence>
        {showClearTrashModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearTrashModal(false)}
              className={`absolute inset-0 bg-black/60 backdrop-blur-sm`}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-md rounded-3xl p-8 relative z-10 shadow-2xl ${
                darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'
              }`}
            >
              <h2 className="text-2xl font-black mb-4">Clear Trash?</h2>
              <p className={`mb-8 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                Are you sure you want to permanently delete all items in the trash? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button 
                  disabled={isClearingTrash}
                  onClick={() => setShowClearTrashModal(false)}
                  className={`flex-1 px-6 py-4 rounded-2xl font-medium border transition-all ${
                    darkMode ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  disabled={isClearingTrash}
                  onClick={emptyTrash}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-medium transition-all shadow-lg active:scale-95 ${
                    darkMode ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isClearingTrash ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
