'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

type AuthMode = 'login' | 'signup';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('mode');
    if (tab === 'signup') {
      setMode('signup');
    }
  }, []);

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setSuccessMessage(null);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload =
        mode === 'signup' ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      setSuccessMessage(
        mode === 'signup'
          ? 'Account created! Redirecting to your planner...'
          : 'Signed in! Redirecting to your planner...'
      );
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-200/50 p-6 sm:p-8">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 mb-3">
          <Sparkles className="w-6 h-6 text-indigo-50" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {mode === 'login' ? 'Welcome back to NextStep' : 'Create your NextStep account'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {mode === 'login'
            ? 'Sign in to access your saved daily plans and conversation history.'
            : 'Sign up with your email to keep your daily plans and chats synced.'}
        </p>
      </div>

      {/* Mode Switch Tabs */}
      <div
        role="tablist"
        aria-label="Authentication mode"
        className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 mb-5"
      >
        <button
          role="tab"
          aria-selected={mode === 'login'}
          type="button"
          onClick={() => handleModeChange('login')}
          className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mode === 'login'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          role="tab"
          aria-selected={mode === 'signup'}
          type="button"
          onClick={() => handleModeChange('signup')}
          className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mode === 'signup'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sign Up with Email
        </button>
      </div>

      {/* Email Auth Form */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label
              htmlFor="auth-name"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Full Name
            </label>
            <div className="relative flex items-center">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                id="auth-name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-colors"
              />
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="auth-email"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Email Address
          </label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-colors"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Password
          </label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-9 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Footer Helper Links */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          {mode === 'login' ? (
            <span>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                className="text-indigo-600 font-semibold hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="text-indigo-600 font-semibold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
        <Link
          href="/"
          className="hover:text-slate-800 transition-colors underline font-medium"
        >
          Continue as guest →
        </Link>
      </div>
    </div>
  );
}
