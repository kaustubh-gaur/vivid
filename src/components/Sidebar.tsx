import React from 'react';
import {
  Home,
  Layers,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
  Presentation,
  Moon,
  Sun
} from 'lucide-react';

import { auth } from '../lib/firebase';
import { motion } from 'motion/react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  recentProjects: any[];
  onSelectProject: (id: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export function Sidebar({
  activeView,
  onViewChange,
  isCollapsed,
  setIsCollapsed,
  recentProjects,
  onSelectProject,
  darkMode,
  setDarkMode
}: SidebarProps) {

  const user = auth.currentUser;

  const menuItems = [
    { id: 'home', icon: <Home className="w-5 h-5" />, label: 'Home' },
    { id: 'templates', icon: <Layers className="w-5 h-5" />, label: 'Templates' },
    { id: 'trash', icon: <Trash2 className="w-5 h-5" />, label: 'Trash' },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? '80px' : '280px' }}
      className={`relative h-screen flex flex-col border-r transition-all duration-300 z-40 ${darkMode
          ? 'bg-zinc-900 border-zinc-800'
          : 'bg-white border-gray-100'
        }`}
    >

      {/* Header */}
      <div className="p-6 flex items-center justify-between">

        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-black rounded-lg">
              <Presentation className="w-5 h-5 text-white" />
            </div>

            <span
              className={`text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'
                }`}
            >
              Vivid
            </span>
          </div>
        ) : (
          <div className="p-1.5 bg-black rounded-lg mx-auto">
            <Presentation className="w-5 h-5 text-white" />
          </div>
        )}

      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute -right-3 top-8 w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all ${darkMode
            ? 'bg-zinc-800 border border-zinc-700 text-white'
            : 'bg-white border border-gray-100 hover:bg-gray-50'
          }`}
      >
        {isCollapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />
        }
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">

        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 ${activeView === item.id
                ? darkMode
                  ? 'bg-zinc-800 text-white shadow-lg'
                  : 'bg-zinc-950 text-white shadow-xl scale-[1.02]'
                : darkMode
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  : 'text-zinc-800 hover:text-black hover:bg-zinc-100/80'
              }`}
          >

            <div
              className={`transition-transform duration-200 ${isCollapsed ? 'mx-auto' : ''
                } ${activeView === item.id ? 'scale-110' : ''
                }`}
            >
              {item.icon}
            </div>

            {!isCollapsed && (
              <span
                className={`font-bold text-sm tracking-tight ${activeView === item.id
                    ? 'opacity-100'
                    : 'opacity-80'
                  }`}
              >
                {item.label}
              </span>
            )}

          </button>
        ))}

        {/* Recent Projects */}
        {!isCollapsed && recentProjects.length > 0 && (
          <div className="pt-8">

            <div
              className={`flex items-center justify-between px-3 mb-4 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-gray-400'
                }`}
            >

              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Recently Opened
              </div>

              <button
                onClick={() => {
                  localStorage.removeItem('vivid_recent');
                  window.dispatchEvent(new Event('vivid_recent_updated'));
                }}
                className={`hover:underline ${darkMode
                    ? 'hover:text-white'
                    : 'hover:text-black'
                  }`}
              >
                Clear
              </button>

            </div>

            <div className="space-y-1">

              {recentProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className={`w-full text-left p-3 rounded-xl text-xs font-medium truncate ${darkMode
                      ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {p.title || 'Untitled Presentation'}
                </button>
              ))}

            </div>
          </div>
        )}

      </nav>

      {/* Footer */}
      <div
        className={`p-4 border-t flex flex-col gap-4 ${darkMode
            ? 'border-zinc-800'
            : 'border-gray-100'
          }`}
      >

        {/* Theme Toggle */}
        {!isCollapsed && (
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${darkMode
                ? 'bg-zinc-800 text-white'
                : 'bg-gray-100 text-gray-900'
              }`}
          >

            <div className="flex items-center gap-3">

              {darkMode
                ? <Moon className="w-4 h-4 text-violet-400" />
                : <Sun className="w-4 h-4 text-yellow-500" />
              }

              <span className="text-sm font-medium">
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </span>

            </div>

            <div
              className={`w-10 h-5 rounded-full relative transition-all ${darkMode
                  ? 'bg-violet-600'
                  : 'bg-gray-300'
                }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'right-0.5' : 'left-0.5'
                  }`}
              />
            </div>

          </button>
        )}

        {/* User Card */}
        {!isCollapsed && user && (

          <div
            className={`p-3 rounded-2xl flex items-center gap-3 ${darkMode
                ? 'bg-zinc-800 border border-zinc-700'
                : 'bg-white border border-gray-200 shadow-sm'
              }`}
          >

            {user.photoURL ? (
              <img
                src={user.photoURL}
                className="w-8 h-8 rounded-full border border-violet-500/20"
                alt="Profile"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}

            <div className="flex-1 min-w-0">

              <p
                className={`text-xs font-bold truncate ${darkMode
                    ? 'text-zinc-100'
                    : 'text-zinc-900'
                  }`}
              >
                {user.displayName || 'User'}
              </p>

              <p
                className={`text-[10px] font-bold truncate ${darkMode
                    ? 'text-zinc-300'
                    : 'text-zinc-800'
                  }`}
              >
                {user.email}
              </p>

            </div>

          </div>
        )}

        {/* Collapsed User Avatar */}
        {isCollapsed && user && (

          <>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                className="w-10 h-10 rounded-full border border-white mx-auto"
                alt="Profile"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold mx-auto">
                {user.displayName?.charAt(0) || 'U'}
              </div>
            )}
          </>
        )}

      </div>

    </motion.aside>
  );
}