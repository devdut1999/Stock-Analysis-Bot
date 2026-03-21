'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/hooks/useAuth';

export default function AuthButton() {
  const { user, loading, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />;
  }

  if (!user) {
    return (
      <a
        href="/login"
        className="text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
      >
        Sign In
      </a>
    );
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
        title={displayName}
      >
        {initials}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <a href="/integrations" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              Integrations
            </a>
          </div>
          <div className="border-t border-slate-100 py-1">
            <button
              onClick={signOut}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
