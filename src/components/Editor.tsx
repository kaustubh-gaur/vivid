import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  ChevronLeft, Layout, Image as ImageIcon, Palette, Send, 
  Plus, Trash2, Loader2, Sparkles, Wand2, Monitor, 
  GripVertical, Check, Copy, Share2, Download, FileText,
  Undo2, Redo2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { generateSlideImage, beautifySlideAesthetic } from '../services/geminiService';
import { compressImage } from '../lib/image-utils';
import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, 
  useSensor, useSensors, DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, 
  verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Slide {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  imagePrompt: string;
  layout: string;
  order: number;
  textAlign?: 'left' | 'center' | 'right';
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  fontFamily?: string;
  fontSize?: number;
}

interface Project {
  id: string;
  title: string;
  theme: string;
  shareSlug?: string;
}

const THEMES = [
  { id: 'minimal', name: 'Minimal', bg: 'bg-white', text: 'text-black', accent: 'bg-gray-100', font: 'font-sans', design: 'shadow-[0_0_50px_-12px_rgba(0,0,0,0.15)] rounded-[2.5rem]' },
  { id: 'dark', name: 'Night', bg: 'bg-zinc-950', text: 'text-white', accent: 'bg-zinc-800', font: 'font-sans', design: 'shadow-2xl border-b-[12px] border-violet-500 rounded-2xl' },
  { id: 'funky', name: 'Funky', bg: 'bg-gradient-to-br from-yellow-300 via-pink-400 to-purple-500', text: 'text-black', accent: 'bg-white', font: 'font-serif', design: 'border-[12px] border-black shadow-[16px_16px_0_0_rgba(0,0,0,1)] rounded-[3rem]' },
  { id: 'educational', name: 'Educational', bg: 'bg-[#F8F9FA] bg-[url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'1\' fill=\'rgba(0,0,0,0.05)\'/%3E%3C/svg%3E")]', text: 'text-blue-950', accent: 'bg-blue-300', font: 'font-sans', design: 'border-l-[32px] border-blue-500 shadow-2xl rounded-3xl' },
  { id: 'brutalist', name: 'Brutalist', bg: 'bg-[#FFDE00]', text: 'text-black', accent: 'bg-white', font: 'font-mono', design: 'border-8 border-black shadow-[24px_24px_0_0_rgba(0,0,0,1)] rounded-none' },
  { id: 'serif', name: 'Editorial', bg: 'bg-[#F4F1ED]', text: 'text-[#2D2A26]', accent: 'bg-[#D1C8B4]', font: 'font-serif', design: 'border border-[#2D2A26]/20 shadow-2xl rounded-[1rem]' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', bg: 'bg-slate-950', text: 'text-cyan-400', accent: 'bg-fuchsia-600/20', font: 'font-mono', design: 'border border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.2)] rounded-lg' },
  { id: 'glassmorphism', name: 'Glassmorphism', bg: 'bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-3xl', text: 'text-slate-800', accent: 'bg-white/40', font: 'font-sans', design: 'border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-[2.5rem]' },
  { id: 'minimal-swiss', name: 'Minimal Swiss', bg: 'bg-white', text: 'text-zinc-950', accent: 'bg-zinc-100', font: 'font-sans font-semibold', design: 'border border-zinc-200 shadow-sm rounded-none' },
  { id: 'apple-keynote', name: 'Apple Keynote', bg: 'bg-zinc-900', text: 'text-zinc-50 tracking-tight', accent: 'bg-zinc-800', font: 'font-sans font-light', design: 'shadow-2xl rounded-[2rem] border border-white/10' },
  { id: 'retro-90s', name: 'Retro 90s', bg: 'bg-indigo-600', text: 'text-yellow-300', accent: 'bg-pink-500', font: 'font-sans font-black tracking-widest', design: 'border-8 border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] rounded-xl' },
  { id: 'luxury', name: 'Luxury Black & Gold', bg: 'bg-zinc-950', text: 'text-amber-200', accent: 'bg-amber-900/40', font: 'font-serif', design: 'border border-amber-500/30 shadow-[0_0_40px_rgba(217,119,6,0.1)] rounded-3xl' },
  { id: 'anime', name: 'Anime / Manga', bg: 'bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]', text: 'text-black', accent: 'bg-rose-500', font: 'font-sans font-black italic', design: 'border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-sm' },
  { id: 'hud', name: 'Futuristic HUD', bg: 'bg-emerald-950', text: 'text-emerald-400', accent: 'bg-emerald-500/20', font: 'font-mono tracking-widest', design: 'border border-emerald-500/30 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] rounded-xl uppercase' },
  { id: 'nature', name: 'Nature / Organic', bg: 'bg-stone-50', text: 'text-stone-800', accent: 'bg-teal-100', font: 'font-serif', design: 'border border-stone-200 shadow-lg rounded-[3rem]' },
  { id: 'editorial-mag', name: 'Editorial Magazine', bg: 'bg-[#F4F1ED]', text: 'text-[#2D2A26]', accent: 'bg-[#D1C8B4]', font: 'font-serif', design: 'border border-[#2D2A26]/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] rounded-sm' },
  { id: 'bauhaus', name: 'Bauhaus', bg: 'bg-[#f4f0e6]', text: 'text-black', accent: 'bg-[#e32c22]', font: 'font-sans font-bold', design: 'border-[8px] border-black shadow-[16px_16px_0_0_rgba(227,44,34,1)] rounded-none' },
  { id: 'terminal', name: 'Terminal / Hacker', bg: 'bg-black', text: 'text-green-500', accent: 'bg-green-900/30', font: 'font-mono', design: 'border border-green-500/30 rounded-none' },
  { id: 'claymorphism', name: 'Claymorphism', bg: 'bg-blue-50', text: 'text-blue-900', accent: 'bg-blue-200', font: 'font-sans font-bold', design: 'shadow-[inset_-10px_-10px_20px_rgba(0,0,0,0.05),_inset_10px_10px_20px_rgba(255,255,255,0.8),_10px_10px_30px_rgba(0,0,0,0.05)] rounded-[3rem]' },
  { id: 'minimal-white', name: 'Futuristic Minimal White', bg: 'bg-white', text: 'text-zinc-600', accent: 'bg-zinc-100', font: 'font-sans tracking-tight', design: 'shadow-[0_0_60px_-15px_rgba(0,0,0,0.05)] rounded-[3rem] border border-zinc-100' },
  { id: 'dark-cinematic', name: 'Dark Cinematic', bg: 'bg-[#0a0a0a]', text: 'text-zinc-300', accent: 'bg-zinc-800', font: 'font-sans font-medium', design: 'shadow-2xl rounded-2xl border border-white/5' },
  { id: 'scientific', name: 'Scientific / Research', bg: 'bg-slate-50', text: 'text-slate-900', accent: 'bg-blue-100', font: 'font-serif', design: 'border border-slate-300 shadow-sm rounded-md' },
  { id: 'startup', name: 'Startup Pitch Deck', bg: 'bg-slate-900', text: 'text-white', accent: 'bg-indigo-500', font: 'font-sans font-semibold', design: 'shadow-2xl border-t-[8px] border-indigo-500 rounded-2xl' },
  { id: 'gradient-mesh', name: 'Futuristic Gradient Mesh', bg: 'bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-indigo-500', text: 'text-white', accent: 'bg-white/20', font: 'font-sans font-black', design: 'shadow-[0_20px_50px_-12px_rgba(139,92,246,0.5)] rounded-[2.5rem]' },
  { id: 'comic', name: 'Comic Pop-Art', bg: 'bg-yellow-300 bg-[url("data:image/svg+xml,%3Csvg width=\'12\' height=\'12\' viewBox=\'0 0 12 12\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'2\' fill=\'rgba(0,0,0,0.2)\'/%3E%3C/svg%3E")]', text: 'text-black uppercase', accent: 'bg-red-500', font: 'font-sans font-black italic', design: 'border-[6px] border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)] rounded-xl' },
  { id: 'minimal-mono', name: 'Minimal Monochrome', bg: 'bg-[#fcfcfc]', text: 'text-[#1a1a1a]', accent: 'bg-[#e5e5e5]', font: 'font-sans font-light', design: 'border border-[#e5e5e5] rounded-3xl' },
];

function SortableSlideItem({ slide, isActive, onClick, theme, darkMode }: { slide: Slide, isActive: boolean, onClick: () => void, theme: any, darkMode: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
        isActive 
          ? 'bg-black text-white shadow-md' 
          : (darkMode ? 'text-zinc-200 hover:bg-zinc-800 hover:text-white' : 'text-zinc-900 hover:bg-gray-100 shadow-sm border border-transparent hover:border-gray-200 font-medium')
      }`}
      onClick={onClick}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-zinc-500" />
      </div>
      <div className={`flex-shrink-0 w-16 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold border ${
        isActive 
          ? 'border-white/40 bg-white/20' 
          : (darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-white border-gray-200 text-gray-600')
      }`}>
        SLIDE {slide.order + 1}
      </div>
      <span className="flex-1 text-sm font-medium truncate">{slide.title || 'Untitled Slide'}</span>
    </div>
  );
}

export function Editor({ projectId, onBack, darkMode = false }: { projectId: string; onBack: () => void; darkMode?: boolean }) {
  const [project, setProject] = useState<Project | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'pptx' | null>(null);
  const [history, setHistory] = useState<Slide[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const isGuest = projectId === 'local-guest';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const saveToHistory = useCallback((newSlides: Slide[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      // Only save if different from last
      if (newHistory.length > 0 && JSON.stringify(newHistory[newHistory.length - 1]) === JSON.stringify(newSlides)) {
        return prev;
      }
      return [...newHistory, [...newSlides]].slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => {
      const newHistory = history.slice(0, prev + 1);
      if (newHistory.length > 0 && JSON.stringify(newHistory[newHistory.length - 1]) === JSON.stringify(newSlides)) {
        return prev;
      }
      return Math.min(prev + 1, 49);
    });
  }, [historyIndex, history]);

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      applyHistoryState(prevState);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      applyHistoryState(nextState);
    }
  };

  const applyHistoryState = async (state: Slide[]) => {
    if (isGuest) {
      setSlides(state);
    } else {
      setSlides(state);
      // Sync to cloud using batch
      const { writeBatch, doc } = await import('firebase/firestore');
      const batch = writeBatch(db);
      state.forEach((s) => {
        const slideRef = doc(db, `projects/${projectId}/slides`, s.id);
        batch.update(slideRef, {
          title: s.title,
          content: s.content,
          imageUrl: s.imageUrl,
          layout: s.layout,
          order: s.order,
          textAlign: s.textAlign || 'center',
          isBold: s.isBold || false,
          isItalic: s.isItalic || false,
          isUnderline: s.isUnderline || false,
          fontFamily: s.fontFamily || '',
          fontSize: s.fontSize || 0
        });
      });
      await batch.commit();
    }
  };

  useEffect(() => {
    if (isGuest) {
      const saved = localStorage.getItem('vivid_guest_project');
      if (saved) {
        const data = JSON.parse(saved);
        setProject(data.project);
        setSlides(data.slides);
      } else {
        const defaultProject = { id: 'local-guest', title: 'Guest Presentation', theme: 'minimal' };
        const defaultSlides = [{
          id: 'slide-1',
          title: 'Welcome Guest',
          content: 'You can create and export presentations even without an account.\n\nNote: Sign in to save your work to the cloud.',
          imageUrl: '',
          imagePrompt: '',
          layout: 'basic',
          order: 0
        }];
        setProject(defaultProject);
        setSlides(defaultSlides);
      }
      setLoading(false);
      return;
    }

    const projUnsub = onSnapshot(doc(db, 'projects', projectId), (d) => {
      setProject({ id: d.id, ...d.data() } as Project);
    }, (error) => {
      console.error('Firestore Error:', error);
      toast.error('Failed to load project details');
    });

    const slidesQuery = query(collection(db, `projects/${projectId}/slides`), orderBy('order', 'asc'));
    const slidesUnsub = onSnapshot(slidesQuery, (snap) => {
      const s = snap.docs.map(d => ({ id: d.id, ...d.data() } as Slide));
      setSlides(s);
      if (s.length > 0 && !activeSlideId) setActiveSlideId(s[0].id);
      setLoading(false);
    }, (error) => {
      console.error('Firestore Error:', error);
      toast.error('Failed to load slides');
    });

    return () => { projUnsub(); slidesUnsub(); };
  }, [projectId]);

  // Handle local persistence for guests
  useEffect(() => {
    if (isGuest && project && slides.length > 0) {
      localStorage.setItem('vivid_guest_project', JSON.stringify({ project, slides }));
    }
  }, [project, slides, isGuest]);

  useEffect(() => {
    if (slides.length > 0 && !activeSlideId) setActiveSlideId(slides[0].id);
  }, [slides, activeSlideId]);

  const activeSlide = slides.find(s => s.id === activeSlideId);
  const theme = THEMES.find(t => t.id === (project?.theme || 'minimal')) || THEMES[0];

  const pushHistoryIfChanged = (newSlides: Slide[]) => {
    if (JSON.stringify(newSlides) !== JSON.stringify(history[historyIndex])) {
      saveToHistory(newSlides);
    }
  };

  const updateSlide = async (updates: Partial<Slide>) => {
    if (!activeSlideId) return;
    const newSlides = slides.map(s => s.id === activeSlideId ? { ...s, ...updates } : s);
    setSlides(newSlides);
    pushHistoryIfChanged(newSlides);

    if (!isGuest) {
      await updateDoc(doc(db, `projects/${projectId}/slides`, activeSlideId), updates);
    }
  };

  const renameProject = async (newTitle: string) => {
    if (!project) return;
    setProject({ ...project, title: newTitle });
    
    // Update in recent projects
    const saved = localStorage.getItem('vivid_recent');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let changed = false;
        const updated = parsed.map((p: any) => {
          if (p.id === projectId) {
            changed = true;
            return { ...p, title: newTitle };
          }
          return p;
        });
        if (changed) {
          localStorage.setItem('vivid_recent', JSON.stringify(updated));
          window.dispatchEvent(new Event('vivid_recent_updated'));
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!isGuest) {
      import('firebase/firestore').then(({ updateDoc, doc }) => {
        updateDoc(doc(db, 'projects', projectId), { title: newTitle });
      });
    }
  };

  const addSlide = async () => {
    const nextOrder = slides.length;
    if (isGuest) {
      const newSlide: Slide = {
        id: Math.random().toString(36).substring(7),
        title: 'New Slide',
        content: '',
        imageUrl: '',
        imagePrompt: '',
        layout: 'basic',
        order: nextOrder
      };
      setSlides([...slides, newSlide]);
      setActiveSlideId(newSlide.id);
      toast.success('Slide added');
      return;
    }
    const ref = await addDoc(collection(db, `projects/${projectId}/slides`), {
      projectId,
      order: nextOrder,
      title: 'New Slide',
      content: '',
      imagePrompt: '',
      layout: 'basic'
    });
    setActiveSlideId(ref.id);
    toast.success('Slide added');
  };

  const deleteSlide = async () => {
    if (slides.length <= 1) return toast.error("Can't delete the last slide");
    if (!activeSlideId) return;
    const index = slides.findIndex(s => s.id === activeSlideId);
    if (isGuest) {
      setSlides(prev => {
        const filtered = prev.filter(s => s.id !== activeSlideId);
        return filtered.map((s, i) => ({ ...s, order: i }));
      });
      setActiveSlideId(slides[index === 0 ? 1 : index - 1].id);
      toast.success('Slide deleted');
      return;
    }
    await deleteDoc(doc(db, `projects/${projectId}/slides`, activeSlideId));
    setActiveSlideId(slides[index === 0 ? 1 : index - 1].id);
    toast.success('Slide deleted');
  };

  const exportPDF = async () => {
    setExporting('pdf');
    try {
      const pdf = new jsPDF('l', 'px', [1280, 720]);
      for (let i = 0; i < slides.length; i++) {
        setActiveSlideId(slides[i].id);
        await new Promise(r => setTimeout(r, 500)); // Allow render
        const element = document.getElementById('slide-canvas');
        if (element) {
          const canvas = await html2canvas(element, { useCORS: true, scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          if (i > 0) pdf.addPage([1280, 720], 'l');
          pdf.addImage(imgData, 'PNG', 0, 0, 1280, 720);
        }
      }
      pdf.save(`${project?.title || 'presentation'}.pdf`);
      toast.success('PDF exported successfully');
    } catch (e) {
      console.error(e);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(null);
    }
  };

  const exportPPTX = () => {
    setExporting('pptx');
    try {
      const pres = new pptxgen();
      slides.forEach(slide => {
        const pSlide = pres.addSlide();
        pSlide.background = { color: theme.id === 'dark' ? '1D1D1F' : (theme.id === 'minimal' ? 'FFFFFF' : 'FBFBFB') };
        
        pSlide.addText(slide.title, {
          x: 1, y: 1, w: '80%', h: 1,
          fontSize: 32,
          bold: true,
          color: theme.id === 'dark' ? 'FFFFFF' : '000000',
          align: 'center'
        });

        pSlide.addText(slide.content, {
          x: 1, y: 2, w: '80%', h: 3,
          fontSize: 18,
          color: theme.id === 'dark' ? 'CCCCCC' : '666666',
          align: 'center'
        });
      });
      pres.writeFile({ fileName: `${project?.title || 'presentation'}.pptx` });
      toast.success('PPTX exported successfully');
    } catch (e) {
      toast.error('Failed to export PPTX');
    } finally {
      setExporting(null);
    }
  };

  const generateImage = async () => {
    if (!activeSlide?.imagePrompt) return;
    if (!auth.currentUser) {
      toast.info('Please sign in to generate AI images');
      return;
    }
    setIsGeneratingImage(true);
    const toastId = toast.loading('Generating AI visual...');
    try {
      const url = await generateSlideImage(activeSlide.imagePrompt);
      if (url) {
        const compressedUrl = await compressImage(url);
        await updateSlide({ imageUrl: compressedUrl });
        toast.success('Visual generated!', { id: toastId });
      } else {
        toast.error('Failed to generate visual', { id: toastId });
      }
    } catch (e) {
      toast.error('Error generating image', { id: toastId });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const beautifySlide = async () => {
    if (!activeSlide) return;
    setIsPolishing(true);
    const toastId = toast.loading('Beautifying aesthetics with AI...');
    try {
      const { layout, formattedContent } = await beautifySlideAesthetic(activeSlide.title, activeSlide.content);
      await updateSlide({ layout, content: formattedContent });
      toast.success('Slide beautified!', { id: toastId });
    } catch (e) {
      toast.error('Failed to beautify', { id: toastId });
    } finally {
      setIsPolishing(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = slides.findIndex(s => s.id === active.id);
      const newIndex = slides.findIndex(s => s.id === over.id);
      const newSlides = arrayMove(slides, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
      
      setSlides(newSlides);
      pushHistoryIfChanged(newSlides);

      if (!isGuest) {
        const { writeBatch, doc } = await import('firebase/firestore');
        const batch = writeBatch(db);
        newSlides.forEach((slide) => {
          const slideRef = doc(db, `projects/${projectId}/slides`, slide.id);
          batch.update(slideRef, { order: slide.order });
        });
        await batch.commit();
      }
    }
  };

  const toggleShare = async () => {
    if (project?.shareSlug) {
      await updateDoc(doc(db, 'projects', projectId), { shareSlug: null });
    } else {
      const slug = Math.random().toString(36).substring(7);
      await updateDoc(doc(db, 'projects', projectId), { shareSlug: slug });
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/share/${project?.shareSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !project) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  const formatClasses = `${activeSlide?.isBold ? 'font-bold' : ''} ${activeSlide?.isItalic ? 'italic' : ''} ${activeSlide?.isUnderline ? 'underline' : ''} ${activeSlide?.textAlign === 'left' ? 'text-left' : activeSlide?.textAlign === 'right' ? 'text-right' : 'text-center'}`;

  const slideStyle = {
    fontFamily: activeSlide?.fontFamily || undefined,
    fontSize: activeSlide?.fontSize ? `${activeSlide.fontSize}px` : '24px',
  };

  return (
    <div className="flex flex-col gap-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="grid grid-cols-12 gap-8 h-[calc(100vh-160px)]"
      >
      {/* Sidebar */}
      <div className={`col-span-3 flex flex-col gap-4 ${darkMode ? 'text-zinc-400' : 'text-gray-900'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button onClick={onBack} title="Back to Dashboard" className={`p-2 rounded-xl transition-all ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <input 
                value={project.title}
                onChange={(e) => renameProject(e.target.value)}
                placeholder="Presentation Title"
                className={`text-lg font-bold bg-transparent border-none outline-none focus:ring-0 ${darkMode ? 'text-white' : 'text-gray-900'} w-48 truncate`}
              />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>Presentation</span>
            </div>
          </div>
          <button 
            onClick={addSlide}
            className={`p-2 rounded-lg transition-all active:scale-95 ${darkMode ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-black text-white hover:bg-gray-800'}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar`}>
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={slides.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {slides.map((slide) => (
                <SortableSlideItem 
                   key={slide.id} 
                   slide={slide} 
                   isActive={activeSlideId === slide.id} 
                   onClick={() => setActiveSlideId(slide.id)}
                   theme={theme}
                   darkMode={darkMode}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className={`pt-4 border-t flex flex-col gap-2 ${darkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
          <div className="grid grid-cols-2 gap-2">
            <button 
              disabled={exporting === 'pptx'}
              onClick={exportPPTX}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl transition-all text-xs font-bold border ${exporting === 'pptx' ? 'opacity-50' : ''} ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-white border-gray-200 hover:border-black'}`}
            >
              {exporting === 'pptx' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              PPTX
            </button>
            <button 
              disabled={exporting === 'pdf'}
              onClick={exportPDF}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl transition-all text-xs font-bold border ${exporting === 'pdf' ? 'opacity-50' : ''} ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-white border-gray-200 hover:border-black'}`}
            >
              {exporting === 'pdf' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
              PDF
            </button>
          </div>

          <button 
            onClick={() => setIsPreview(!isPreview)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${isPreview ? (darkMode ? 'bg-violet-600 text-white' : 'bg-black text-white') : (darkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-200 hover:border-black')}`}
          >
            <Monitor className="w-4 h-4" />
            <span className="text-sm font-medium">{isPreview ? 'Edit Mode' : 'Presenter View'}</span>
          </button>
          
          <button 
            onClick={() => setShowThemePanel(!showThemePanel)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-white border-gray-200 hover:border-black'}`}
          >
            <Palette className="w-4 h-4" />
            <span className="text-sm font-medium">Themes</span>
          </button>
          
          <div className="flex gap-2">
            <button 
              disabled={historyIndex <= 0}
              onClick={undo}
              className={`flex-1 flex items-center justify-center p-3 rounded-2xl transition-all border ${historyIndex <= 0 ? 'opacity-30 cursor-not-allowed' : (darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200')}`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button 
              disabled={historyIndex >= history.length - 1}
              onClick={redo}
              className={`flex-1 flex items-center justify-center p-3 rounded-2xl transition-all border ${historyIndex >= history.length - 1 ? 'opacity-30 cursor-not-allowed' : (darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200')}`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (isGuest) {
                  alert('Cloud sharing requires an account. Please sign in.');
                  return;
                }
                toggleShare();
              }}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl transition-all font-medium text-sm ${project.shareSlug ? 'bg-green-50 text-green-600 border border-green-100' : (darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-gray-50 border border-gray-100 text-gray-600 hover:border-gray-200')}`}
            >
              <Share2 className="w-4 h-4" />
              {project.shareSlug ? 'Shared' : 'Share'}
            </button>
            <button 
              onClick={deleteSlide}
              className={`p-3 rounded-2xl transition-all ${darkMode ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          {project.shareSlug && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2"
            >
              <button 
                onClick={copyShareLink}
                className="w-full text-xs flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-500 hover:text-black transition-all"
              >
                <span className="truncate mr-2">/share/{project.shareSlug}</span>
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="col-span-9 flex flex-col gap-6">
        {/* Canvas Area */}
        <div id="slide-canvas" style={slideStyle} className={`relative flex-1 p-12 overflow-hidden transition-all duration-500 ${theme.bg} ${theme.text} ${theme.font} ${theme.design} ${isPreview ? 'scale-[1.02]' : ''}`}>
          {activeSlide ? (
            <div className="h-full relative z-10">
              {activeSlide.layout !== 'split' && activeSlide.imageUrl && (
                <div className="absolute inset-0 -m-12 z-0 overflow-hidden opacity-30 select-none pointer-events-none">
                  <img src={activeSlide.imageUrl} alt="" className="w-full h-full object-cover" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${theme.bg === 'bg-white' ? 'from-white' : theme.bg === 'bg-zinc-950' ? 'from-zinc-950' : 'from-current opacity-30'} to-transparent`} />
                </div>
              )}
              {activeSlide.layout === 'basic' ? (
                <div className={`h-full flex flex-col items-center justify-center relative z-10 ${formatClasses}`}>
                  {isPreview ? (
                    <h1 className="text-[2.5em] font-bold mb-8 w-full">{activeSlide.title || 'Untitled'}</h1>
                  ) : (
                    <input 
                      value={activeSlide.title}
                      onChange={(e) => updateSlide({ title: e.target.value })}
                      className={`text-[2.5em] font-bold bg-transparent border-none outline-none focus:ring-0 w-full mb-8 placeholder:opacity-60 ${activeSlide?.textAlign === 'left' ? 'text-left' : activeSlide?.textAlign === 'right' ? 'text-right' : 'text-center'}`}
                      placeholder="Main Title"
                    />
                  )}
                  {isPreview ? (
                    <p className="text-[1em] leading-relaxed w-full whitespace-pre-wrap">{activeSlide.content}</p>
                  ) : (
                    <textarea 
                      value={activeSlide.content}
                      onChange={(e) => updateSlide({ content: e.target.value })}
                      className={`text-[1em] leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none placeholder:opacity-60 w-full h-64 ${activeSlide?.textAlign === 'left' ? 'text-left' : activeSlide?.textAlign === 'right' ? 'text-right' : 'text-center'}`}
                      placeholder="Start typing your key points..."
                    />
                  )}
                </div>
              ) : activeSlide.layout === 'focus' ? (
                <div className={`h-full flex flex-col items-center justify-center p-12 relative z-10 ${formatClasses}`}>
                   {isPreview ? (
                     <h1 className="text-[2em] font-black leading-tight w-full whitespace-pre-wrap">{activeSlide.content || '...'}</h1>
                   ) : (
                     <textarea 
                      value={activeSlide.content}
                      onChange={(e) => updateSlide({ content: e.target.value })}
                      className={`text-[2em] font-black leading-tight bg-transparent border-none outline-none focus:ring-0 resize-none placeholder:opacity-20 w-full flex items-center justify-center h-full ${activeSlide?.textAlign === 'left' ? 'text-left' : activeSlide?.textAlign === 'right' ? 'text-right' : 'text-center'}`}
                      placeholder="A single, powerful statement..."
                    />
                   )}
                </div>
              ) : (
                <div className={`h-full flex flex-col relative z-10 ${formatClasses}`}>
                  {isPreview ? (
                    <h1 className="text-[1.5em] font-bold mb-8 w-full">{activeSlide.title || 'Untitled'}</h1>
                  ) : (
                    <input 
                      value={activeSlide.title}
                      onChange={(e) => updateSlide({ title: e.target.value })}
                      className={`text-[1.5em] font-bold bg-transparent border-none outline-none focus:ring-0 w-full mb-8 placeholder:opacity-20 ${activeSlide?.textAlign === 'left' ? 'text-left' : activeSlide?.textAlign === 'right' ? 'text-right' : 'text-center'}`}
                      placeholder="Slide Title..."
                    />
                  )}
                  
                  <div className="flex-1 grid grid-cols-2 gap-12">
                    {isPreview ? (
                      <p className="text-[0.85em] leading-relaxed whitespace-pre-wrap">{activeSlide.content}</p>
                    ) : (
                      <textarea 
                        value={activeSlide.content}
                        onChange={(e) => updateSlide({ content: e.target.value })}
                        className={`text-[0.85em] leading-relaxed bg-transparent border-none outline-none focus:ring-0 resize-none placeholder:opacity-20 flex-1 ${activeSlide?.textAlign === 'left' ? 'text-left' : activeSlide?.textAlign === 'right' ? 'text-right' : 'text-center'}`}
                        placeholder="Tell your story here..."
                      />
                    )}
                    
                    <div className={`relative group rounded-3xl overflow-hidden bg-black/5 flex items-center justify-center border border-current transition-all ${activeSlide.imageUrl ? 'opacity-100' : 'opacity-10'}`}>
                      {isGeneratingImage ? (
                        <div className="flex flex-col items-center gap-2">
                           <Loader2 className="w-8 h-8 animate-spin opacity-40" />
                           <p className="text-[10px] font-bold tracking-widest uppercase opacity-40">Designing...</p>
                        </div>
                      ) : activeSlide.imageUrl ? (
                        <>
                          <img src={activeSlide.imageUrl} className="w-full h-full object-cover group-hover:opacity-90 transition-all dark:opacity-80" alt="" />
                          {!isPreview && (
                            <button 
                              onClick={() => updateSlide({ imageUrl: '' })}
                              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="text-center p-8">
                          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                          <p className="text-sm opacity-30">AI Visual Generation</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="opacity-20">Select a slide to start editing</p>
            </div>
          )}
          
          {/* Theme Badge */}
          <div className="absolute top-6 right-6 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase opacity-40">
            {theme.name}
          </div>
        </div>

        {/* Action Bar */}
        <AnimatePresence>
          {!isPreview && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col gap-6 w-full"
            >
              {/* Top Formatting Bar */}
              <div className={`flex items-center gap-4 h-24 border rounded-3xl px-8 shadow-sm ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
                <div className="flex-1 flex items-center gap-6 overflow-x-auto overflow-y-hidden no-scrollbar">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <div className={`flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                        <Monitor className="w-3 h-3" />
                        Layouts
                      </div>
                      <div className="flex gap-1">
                        {[
                          { id: 'basic', label: 'T', desc: 'Title Only' },
                          { id: 'split', label: 'T|C', desc: 'Title & Content' },
                          { id: 'focus', label: 'C', desc: 'Content Focus' }
                        ].map(l => (
                          <button 
                            key={l.id}
                            title={l.desc}
                            onClick={() => updateSlide({ layout: l.id })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeSlide?.layout === l.id ? (darkMode ? 'bg-violet-600 text-white border-violet-500 shadow-lg' : 'bg-black text-white border-black shadow-md') : (darkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm')}`}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={`h-10 w-px ${darkMode ? 'bg-zinc-800' : 'bg-gray-100'}`} />

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <div className={`flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                        <Type className="w-3 h-3" />
                        Format
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => updateSlide({ isBold: !activeSlide?.isBold })}
                          className={`p-1.5 rounded-lg transition-all border ${activeSlide?.isBold ? (darkMode ? 'bg-violet-600 text-white border-violet-500' : 'bg-black text-white border-black') : (darkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}`}
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => updateSlide({ isItalic: !activeSlide?.isItalic })}
                          className={`p-1.5 rounded-lg transition-all border ${activeSlide?.isItalic ? (darkMode ? 'bg-violet-600 text-white border-violet-500' : 'bg-black text-white border-black') : (darkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}`}
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => updateSlide({ isUnderline: !activeSlide?.isUnderline })}
                          className={`p-1.5 rounded-lg transition-all border ${activeSlide?.isUnderline ? (darkMode ? 'bg-violet-600 text-white border-violet-500' : 'bg-black text-white border-black') : (darkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}`}
                        >
                          <Underline className="w-4 h-4" />
                        </button>
                        
                        <div className={`h-6 w-px mx-1 ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'}`} />
                        
                        <button 
                          onClick={() => updateSlide({ textAlign: 'left' })}
                          className={`p-1.5 rounded-lg transition-all border ${activeSlide?.textAlign === 'left' ? (darkMode ? 'bg-violet-600 text-white border-violet-500' : 'bg-black text-white border-black') : (darkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}`}
                        >
                          <AlignLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => updateSlide({ textAlign: 'center' })}
                          className={`p-1.5 rounded-lg transition-all border ${(!activeSlide?.textAlign || activeSlide?.textAlign === 'center') ? (darkMode ? 'bg-violet-600 text-white border-violet-500' : 'bg-black text-white border-black') : (darkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}`}
                        >
                          <AlignCenter className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => updateSlide({ textAlign: 'right' })}
                          className={`p-1.5 rounded-lg transition-all border ${activeSlide?.textAlign === 'right' ? (darkMode ? 'bg-violet-600 text-white border-violet-500' : 'bg-black text-white border-black') : (darkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')}`}
                        >
                          <AlignRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`h-10 w-px ${darkMode ? 'bg-zinc-800' : 'bg-gray-100'}`} />

                  {/* Fonts */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <div className={`flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
                        <Type className="w-3 h-3" />
                        Typography
                      </div>
                      <div className="flex items-center gap-2">
                        <select 
                          value={activeSlide?.fontFamily || ''}
                          onChange={(e) => updateSlide({ fontFamily: e.target.value })}
                          className={`text-xs p-1.5 rounded-lg border outline-none font-medium h-[30px] ${darkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 focus:border-violet-500' : 'bg-white text-gray-700 border-gray-200 focus:border-violet-300'}`}
                        >
                          <option value="">Theme Default</option>
                          <option value="Inter, sans-serif">Inter</option>
                          <option value="'Playfair Display', serif">Playfair</option>
                          <option value="'JetBrains Mono', monospace">Mono</option>
                        </select>
                        
                        <div className="relative">
                          <input 
                            type="number"
                            min="12"
                            max="72"
                            value={activeSlide?.fontSize || 24}
                            onChange={(e) => updateSlide({ fontSize: parseInt(e.target.value) || 24 })}
                            className={`w-[60px] text-xs p-1.5 pl-2 pr-4 rounded-lg border outline-none font-medium h-[30px] ${darkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 focus:border-violet-500' : 'bg-white text-gray-700 border-gray-200 focus:border-violet-300'}`}
                          />
                          <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>px</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`h-10 w-px ${darkMode ? 'bg-zinc-800' : 'bg-gray-100'}`} />

                  <div className="flex items-center gap-3">
                    <button 
                      disabled={isPolishing || !activeSlide}
                      onClick={beautifySlide}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'}`}
                    >
                      {isPolishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3 text-orange-400" />}
                      {isPolishing ? 'Polishing...' : 'Beautify Slide'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom AI Prompt Bar */}
              <div className={`flex items-center gap-4 py-6 px-8 border rounded-3xl shadow-sm ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-violet-500 uppercase tracking-widest">
                      <Sparkles className="w-4 h-4" />
                      AI Vision Generation
                    </div>
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all ${darkMode ? 'bg-zinc-800/50 border-zinc-700 focus-within:border-violet-500' : 'bg-gray-50 border-gray-200 focus-within:border-violet-400 shadow-sm'}`}>
                      <input 
                        value={activeSlide?.imagePrompt || ''}
                        onChange={(e) => updateSlide({ imagePrompt: e.target.value })}
                        placeholder="Describe the imagery you want for this slide..."
                        className={`flex-1 text-sm bg-transparent border-none outline-none focus:ring-0 placeholder:text-zinc-500 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}
                      />
                      <button 
                        disabled={isGeneratingImage || !activeSlide?.imagePrompt}
                        onClick={generateImage}
                        title="Generate professional slide imagery with Gemini"
                        className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-violet-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
                      >
                        {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {isGeneratingImage ? 'Drawing...' : 'Generate Magic Image'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </motion.div>

      {/* Theme Drawer */}
      <AnimatePresence>
        {showThemePanel && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center bg-black/20 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className={`rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Select Theme</h3>
                <button onClick={() => setShowThemePanel(false)} className={`${darkMode ? 'text-zinc-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}>
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {THEMES.map((t) => (
                  <button 
                    key={t.id}
                    onClick={() => { updateDoc(doc(db, 'projects', projectId), { theme: t.id }); setShowThemePanel(false); }}
                    className={`group relative overflow-hidden rounded-2xl border-2 transition-all ${t.bg} ${t.id === project.theme ? 'border-black scale-[1.02]' : 'border-gray-50 hover:border-gray-200'}`}
                  >
                    <div className="p-6 aspect-video flex flex-col justify-between">
                      <div className={`text-sm font-bold tracking-tight ${t.text}`}>{t.name}</div>
                      <div className="flex gap-1">
                        <div className={`w-4 h-4 rounded-full ${t.accent}`} />
                        <div className={`w-4 h-4 rounded-full opacity-50 ${t.text.replace('text-', 'bg-')}`} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
