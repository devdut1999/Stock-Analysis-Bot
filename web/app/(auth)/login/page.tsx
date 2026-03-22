'use client';

import { useState, Suspense, useRef, useEffect } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60 * 1000; // 1 minute

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center text-slate-400">
      Loading...
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get('redirect') || '/';
  const urlError = searchParams.get('error');
  
  // Rate limiting state
  const attemptCount = useRef(0);
  const lockoutUntil = useRef<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Handle URL error params
  useEffect(() => {
    if (urlError) {
      const errorMessages: Record<string, string> = {
        auth_failed: 'Authentication failed. Please try again.',
        missing_code: 'Invalid authentication request.',
        no_session: 'Could not create session. Please try again.',
      };
      setError(errorMessages[urlError] || urlError);
    }
  }, [urlError]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    
    const timer = setInterval(() => {
      const remaining = lockoutUntil.current 
        ? Math.max(0, Math.ceil((lockoutUntil.current - Date.now()) / 1000))
        : 0;
      setLockoutRemaining(remaining);
      
      if (remaining <= 0) {
        lockoutUntil.current = null;
        attemptCount.current = 0;
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check lockout
    if (lockoutUntil.current && Date.now() < lockoutUntil.current) {
      const remaining = Math.ceil((lockoutUntil.current - Date.now()) / 1000);
      setError(`Too many attempts. Please wait ${remaining} seconds.`);
      return;
    }

    // Increment attempt counter
    attemptCount.current++;
    
    // Check if should lock out
    if (attemptCount.current > MAX_ATTEMPTS) {
      lockoutUntil.current = Date.now() + LOCKOUT_DURATION;
      setLockoutRemaining(Math.ceil(LOCKOUT_DURATION / 1000));
      setError(`Too many attempts. Please wait 60 seconds.`);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Reset attempts on success
      attemptCount.current = 0;
      
      // Use router for SPA navigation
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const isLocked = lockoutRemaining > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#5367ff] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#5367ff]/25">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-400 mt-1">Sign in to your Nivesh AI account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={isLocked}
            className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#5367ff] focus:ring-4 focus:ring-[#5367ff]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isLocked}
            className="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#5367ff] focus:ring-4 focus:ring-[#5367ff]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {isLocked && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            Account temporarily locked. Try again in {lockoutRemaining} seconds.
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isLocked}
          className="w-full py-2.5 text-sm font-semibold text-white bg-[#5367ff] rounded-xl hover:bg-[#4356ee] hover:shadow-lg hover:shadow-[#5367ff]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : isLocked ? `Locked (${lockoutRemaining}s)` : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[#5367ff] hover:text-[#4356ee] font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
