import React from 'react';
import { motion } from 'motion/react';
import { 
  Presentation, 
  Sparkles, 
  Zap, 
  Globe, 
  Shield, 
  ChevronRight,
  Play,
  Layers,
  Search,
  ArrowRight
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onGuest: () => void;
  darkMode: boolean;
}

export function LandingPage({ onLogin, onGuest, darkMode }: LandingPageProps) {
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen selection:bg-violet-500 selection:text-white ${darkMode ? 'bg-zinc-950 text-white dark' : 'bg-white text-zinc-900'}`}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 grid grid-cols-3 items-center px-8 py-4 backdrop-blur-xl bg-white/70 dark:bg-zinc-950/70 border-b border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black dark:bg-white rounded-xl shadow-lg">
            <Presentation className="w-6 h-6 text-white dark:text-black" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-black dark:text-white">Vivid</span>
        </div>
        
        <div className="hidden md:flex items-center justify-center gap-8">
          <a 
            href="#features" 
            onClick={(e) => scrollToSection(e, 'features')}
            className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors uppercase tracking-[0.2em] text-[11px] font-black text-black dark:text-white"
          >
            Features
          </a>
        </div>

        <div className="flex items-center justify-end gap-6 text-sm font-bold text-black dark:text-white">
          <button 
            onClick={onLogin}
            className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold shadow-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all active:scale-95"
          >
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-8 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-violet-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-tight md:leading-[1.1] mb-8 text-zinc-950 dark:text-white dark:drop-shadow-[0_0_15px_rgba(0,0,0,1)] drop-shadow-[0_0_15px_rgba(255,255,255,1)] relative z-10">
              Create presentations <br />
              <span className="text-violet-700 dark:text-violet-400 [text-shadow:_0_0_30px_rgba(109,40,217,0.4)] dark:[text-shadow:_0_0_30px_rgba(167,139,250,0.4)]">
                with AI in seconds.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-zinc-950 dark:text-zinc-50 max-w-2xl mx-auto mb-12 leading-relaxed font-bold relative z-10 dark:drop-shadow-[0_0_15px_rgba(0,0,0,1)] drop-shadow-[0_0_15px_rgba(255,255,255,1)]">
              Vivid turns your ideas into cinematic presentations in seconds. 
              Built for speed, designed for impact, powered by Gemini.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 mt-4">
              <button 
                onClick={onLogin}
                className="group relative px-12 py-6 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-2xl shadow-2xl overflow-hidden active:scale-95 transition-all w-full max-w-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center justify-center gap-3">
                  Get Started Free
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>
          </motion.div>

          {/* Cinematic Preview */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="mt-24 p-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-[3rem] shadow-2xl relative"
          >
            <div className="absolute inset-0 bg-violet-500/10 rounded-[3rem] blur-3xl -z-10" />
            <img 
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" 
              className="w-full h-auto rounded-[2.5rem] shadow-inner"
              alt="Dashboard Preview"
            />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-8 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-20">
            <div className="max-w-xl">
              <h2 className="text-5xl lg:text-7xl font-black mb-8 tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1] transition-colors">
                Supercharge your workflow with <span className="bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">AI</span>.
              </h2>
              <p className="text-zinc-900 dark:text-zinc-100 text-2xl font-bold leading-relaxed opacity-90">
                From outline to final slide, Vivid handles the heavy lifting so you can focus on the story.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 rounded-full border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-zinc-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                icon: <Zap className="w-6 h-6 text-orange-500" />, 
                title: "Instant Outlines", 
                desc: "Type a topic and get a complete presentation structure in milliseconds."
              },
              { 
                icon: <Sparkles className="w-6 h-6 text-violet-500" />, 
                title: "AI Image Generation", 
                desc: "Don't search for stock photos. Generate unique visuals for every slide."
              },
              { 
                icon: <Layers className="w-6 h-6 text-blue-500" />, 
                title: "Smart Layouts", 
                desc: "Our AI automatically arranges content for maximum clarity and impact."
              },
              { 
                icon: <Globe className="w-6 h-6 text-green-500" />, 
                title: "Link Sharing", 
                desc: "Share your work instantly with protected, beautiful web links."
              },
              { 
                icon: <Search className="w-6 h-6 text-pink-500" />, 
                title: "Smart Search", 
                desc: "Quickly find any project with powerful title-based indexing."
              },
              { 
                icon: <Shield className="w-6 h-6 text-zinc-500" />, 
                title: "Privacy First", 
                desc: "Your data is encrypted and saved securely in your cloud workspace."
              }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5, scale: 1.02 }}
                className="p-8 bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none"
              >
                <div className="w-14 h-14 bg-violet-50 dark:bg-violet-500/10 rounded-2xl flex items-center justify-center mb-8 border border-violet-100 dark:border-violet-500/20">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-black mb-4 text-black dark:text-white tracking-tight">{f.title}</h3>
                <p className="text-zinc-800 dark:text-zinc-200 text-base leading-relaxed font-bold">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-16 bg-black rounded-[3rem] overflow-hidden text-center text-white">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-600/30 via-transparent to-transparent opacity-50" />
            
            <h2 className="text-5xl font-black tracking-tight mb-6">Ready to present the future?</h2>
            <p className="text-zinc-400 text-lg mb-12 max-w-lg mx-auto">
              Join thousands of creators using Vivid to share their ideas with the world.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onLogin}
                className="px-10 py-5 bg-white text-black rounded-2xl font-bold text-lg hover:bg-zinc-100 transition-all active:scale-95"
              >
                Get Started for Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-zinc-100 dark:border-zinc-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-zinc-400 dark:text-zinc-500">
          <div className="flex items-center gap-3">
            <Presentation className="w-5 h-5" />
            <span className="text-sm font-bold tracking-tight">Vivid</span>
          </div>
          
          <div className="text-[10px] uppercase tracking-widest font-bold">
            © 2026 Vivid AI
          </div>
        </div>
      </footer>
    </div>
  );
}
