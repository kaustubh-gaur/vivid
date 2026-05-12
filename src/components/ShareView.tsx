import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Loader2, ChevronLeft, ChevronRight, Maximize2, Presentation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Slide {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  layout: string;
  order: number;
}

const THEMES = [
  { id: 'minimal', bg: 'bg-white', text: 'text-black' },
  { id: 'dark', bg: 'bg-zinc-900', text: 'text-white' },
  { id: 'vibrant', bg: 'bg-orange-50', text: 'text-orange-950' },
  { id: 'cool', bg: 'bg-blue-50', text: 'text-blue-950' },
];

export function ShareView({ slug, onExit }: { slug: string; onExit: () => void }) {
  const [project, setProject] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, 'projects'), where('shareSlug', '==', slug), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        setLoading(false);
        return;
      }
      const p = { id: snap.docs[0].id, ...snap.docs[0].data() };
      setProject(p);

      const sQuery = query(collection(db, `projects/${p.id}/slides`), orderBy('order', 'asc'));
      const sSnap = await getDocs(sQuery);
      setSlides(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Slide)));
      setLoading(false);
    };
    fetch();
  }, [slug]);

  const next = () => setCurrentIndex(prev => Math.min(prev + 1, slides.length - 1));
  const prev = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slides.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white/20" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <h1 className="text-2xl font-bold mb-4">Presentation not found</h1>
        <button onClick={onExit} className="text-blue-500 underline">Go Back</button>
      </div>
    );
  }

  const theme = THEMES.find(t => t.id === project.theme) || THEMES[0];
  const slide = slides[currentIndex];

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col ${theme.bg} ${theme.text} overflow-hidden`}>
      <header className="px-8 py-4 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-b from-black/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-current rounded-md">
            <Presentation className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold">{project.title}</span>
        </div>
        <button 
          onClick={onExit} 
          className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${theme.id === 'dark' ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800 shadow-xl'}`}
        >
          Exit
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-12 relative">
        <AnimatePresence mode="wait">
          {slide && (
            <motion.div 
              key={slide.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`w-full max-w-5xl aspect-video relative ${(slide as any).isBold ? 'font-bold' : ''} ${(slide as any).isItalic ? 'italic' : ''} ${(slide as any).isUnderline ? 'underline' : ''} ${(slide as any).textAlign === 'left' ? 'text-left' : (slide as any).textAlign === 'right' ? 'text-right' : 'text-center'}`}
            >
              <div className="h-full">
                {slide.layout === 'basic' ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <h2 className="text-6xl font-bold mb-8 tracking-tight w-full">{slide.title}</h2>
                    <p className="text-2xl leading-relaxed opacity-80 whitespace-pre-wrap w-full">{slide.content}</p>
                  </div>
                ) : slide.layout === 'focus' ? (
                  <div className="h-full flex flex-col items-center justify-center p-12">
                    <h2 className="text-5xl font-black leading-tight tracking-tight w-full whitespace-pre-wrap">{slide.content}</h2>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <h2 className="text-5xl font-bold mb-12 tracking-tight w-full">{slide.title}</h2>
                    <div className="flex-1 grid grid-cols-2 gap-12">
                      <div className="text-2xl leading-relaxed opacity-80 whitespace-pre-wrap">
                        {slide.content}
                      </div>
                      {slide.imageUrl && (
                        <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-video">
                          <img src={slide.imageUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className="absolute inset-y-0 left-0 w-24 flex items-center justify-center hover:bg-black/5 transition-all cursor-pointer" onClick={prev}>
          <ChevronLeft className={`w-8 h-8 opacity-20 ${currentIndex === 0 ? 'hidden' : ''}`} />
        </div>
        <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center hover:bg-black/5 transition-all cursor-pointer" onClick={next}>
          <ChevronRight className={`w-8 h-8 opacity-20 ${currentIndex === slides.length - 1 ? 'hidden' : ''}`} />
        </div>
      </main>

      <footer className="px-8 py-6 flex items-center justify-between opacity-50">
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === currentIndex ? 'w-8 bg-current' : 'w-2 bg-current opacity-20'}`} />
          ))}
        </div>
        <span className="text-xs font-bold tracking-widest uppercase">
          {currentIndex + 1} / {slides.length}
        </span>
      </footer>
    </div>
  );
}
