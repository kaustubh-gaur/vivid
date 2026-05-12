import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { ShoppingBag, Star, Sparkles, Loader2, Check, ArrowRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const TEMPLATES = [
  {
    id: 't1',
    name: 'Stealth Startup',
    description: 'A sharp, dark theme for high-stakes pitches and tech innovation.',
    imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=400',
    theme: 'dark'
  },
  {
    id: 't2',
    name: 'Creative Portfolio',
    description: 'Vibrant and expressive for artists, designers, and visionaries.',
    imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&q=80&w=400',
    theme: 'vibrant'
  },
  {
    id: 't3',
    name: 'Global Impact',
    description: 'Trustworthy and professional for NGOs, corporate, and foundations.',
    imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=400',
    theme: 'minimal'
  },
  {
    id: 't4',
    name: 'Modern Brutalist',
    description: 'Raw, honest, and bold. Perfect for counter-culture brands.',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400',
    theme: 'brutalist'
  },
  {
    id: 't5',
    name: 'The Editorial',
    description: 'Magical typography and whitespace for sophisticated storytelling.',
    imageUrl: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?auto=format&fit=crop&q=80&w=400',
    theme: 'serif'
  },
  {
    id: 't6',
    name: 'Arctic Clean',
    description: 'Minimalist and cold. High-focus data presentations.',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400',
    theme: 'cool'
  }
];

export function TemplateStore({ onSelectProject, darkMode = false }: { onSelectProject: (id: string) => void, darkMode?: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);

  const useTemplate = async (template: any) => {
    if (!auth.currentUser) {
      alert('Please sign in to use templates.');
      return;
    }
    setLoading(template.id);
    
    setTimeout(async () => {
      try {
        const projectRef = await addDoc(collection(db, 'projects'), {
          title: `New ${template.name} Presentation`,
          ownerId: auth.currentUser?.uid,
          isTrashed: false,
          theme: template.theme,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Add dummy slide for template
        await addDoc(collection(db, `projects/${projectRef.id}/slides`), {
          projectId: projectRef.id,
          order: 0,
          title: 'Welcome to your Template',
          content: 'This slide was generated from a professional template.',
          imagePrompt: template.description,
          layout: 'basic'
        });

        onSelectProject(projectRef.id);
      } finally {
        setLoading(null);
      }
    }, 1500);
  };

  return (
    <div className={`space-y-16 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <div className="text-center max-w-2xl mx-auto">
        <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6 ${darkMode ? 'bg-violet-500/10 text-violet-500' : 'bg-indigo-50 text-indigo-600'}`}>
          <Sparkles className="w-3 h-3" />
          Free Templates
        </div>
        <h2 className={`text-5xl font-semibold tracking-tight mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Professional Presentations, <br/> Instantly.
        </h2>
        <p className={`text-lg leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
          Unlock high-converting templates designed by world-class creators. 
          Get started with a single click.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {TEMPLATES.map((template) => (
          <motion.div 
            key={template.id}
            whileHover={{ y: -8 }}
            className={`rounded-[2.5rem] overflow-hidden transition-all border ${
              darkMode 
                ? 'bg-zinc-900 border-zinc-800 hover:border-violet-500/50' 
                : 'bg-white border-zinc-200 hover:border-black shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]'
            }`}
          >
            <div className="aspect-video relative overflow-hidden">
              <img src={template.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
              <div className="absolute top-4 left-4">
                <div className="bg-zinc-950/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                  {template.theme}
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>{template.name}</h3>
              <p className={`text-sm mb-10 leading-relaxed h-10 overflow-hidden font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>
                {template.description}
              </p>
              
              <div className="flex items-center justify-end">
                <button 
                  onClick={() => useTemplate(template)}
                  disabled={loading === template.id}
                  className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-sm transition-all disabled:opacity-50 active:scale-95 shadow-lg ${
                    darkMode ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-zinc-950 text-white hover:bg-black'
                  }`}
                >
                  {loading === template.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Use Template
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

