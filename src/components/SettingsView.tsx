import React from 'react';
import { 
  User, 
  ExternalLink,
  LogOut
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export function SettingsView({ darkMode }: { darkMode: boolean }) {
  const user = auth.currentUser;

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: <User className="w-5 h-5 text-gray-400" />, label: 'Personal Information', sub: 'Your linked account details' },
      ]
    }
  ];

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <User className="w-12 h-12 text-gray-200 mb-4" />
        <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Sign in to see settings</h3>
        <p className="text-gray-500">Settings are only available for authenticated users.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-12 py-12">
      <div>
        <h2 className={`text-3xl font-bold tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
        <p className="text-gray-500">Manage your account and app preferences</p>
      </div>

      <div className="space-y-10">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
              {section.title}
            </h3>
            <div className={`rounded-3xl border ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-gray-100 shadow-sm'}`}>
              {section.items.map((item, i) => (
                <div
                  key={i}
                  className={`w-full flex items-center justify-between p-6 border-b last:border-0 ${darkMode ? 'border-zinc-700' : 'border-gray-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${darkMode ? 'bg-zinc-900' : 'bg-gray-100'}`}>
                      {item.icon}
                    </div>
                    <div className="text-left">
                      <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.label}</p>
                      <p className="text-xs text-gray-500">{item.sub}</p>
                    </div>
                  </div>
                  {/* Status indicator instead of interactive arrow for non-functional items */}
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${darkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-50 text-gray-400'}`}>
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button 
          onClick={() => signOut(auth)}
          className="w-full flex items-center justify-between p-6 bg-red-50 text-red-600 rounded-3xl hover:bg-red-100 transition-all font-bold text-sm"
        >
          <div className="flex items-center gap-4">
            <LogOut className="w-5 h-5" />
            Sign Out
          </div>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
