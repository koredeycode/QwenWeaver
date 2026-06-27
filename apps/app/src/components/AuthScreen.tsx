import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Cpu, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store/index.js';

const PRODUCT_QUOTES = [
  {
    category: 'Agent Society',
    title: 'Collective Intelligence',
    text: 'Where multiple autonomous agents collaborate, collective intelligence naturally emerges.',
  },
  {
    category: 'Weave the Future',
    title: 'Weave Solutions Together',
    text: "Agents don't just execute simple commands; they weave multi-step workflows together.",
  },
  {
    category: 'Visualize Logic',
    title: 'Visualize Modern Workflows',
    text: 'Mapping logic onto a visual canvas is the cleanest path to building intelligent systems.',
  },
  {
    category: 'Parallel Orchestration',
    title: 'Conduct the AI Symphony',
    text: 'Orchestrating agents is like conducting an orchestra where every instrument is a distinct mind.',
  },
  {
    category: 'Stream Results',
    title: 'Stream Realtime Execution',
    text: 'Watch nodes glow and edges animate as your multi-agent society executes DAGs concurrently.',
  },
];

export const AuthScreen = () => {
  const login = useStore((s) => s.login);
  const register = useStore((s) => s.register);
  const token = useStore((s) => s.token);

  const navigate = useNavigate();

  const randomQuote = useMemo(() => {
    const idx = Math.floor(Math.random() * PRODUCT_QUOTES.length);
    return PRODUCT_QUOTES[idx];
  }, []);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect to dashboard automatically
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const success = isLogin ? await login(email, password) : await register(email, password);

      if (success) {
        navigate('/');
      } else {
        setError(isLogin ? 'Invalid email or password.' : 'Registration failed.');
      }
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex bg-slate-950 font-sans select-none overflow-y-auto text-slate-800 z-50">
      {/* Background dot grid pattern for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      {/* Main split-screen container - full viewport */}
      <div className="w-full min-h-screen flex flex-col md:flex-row relative">
        {/* Left Side: Wavy Fluid Art Banner (desktop only) */}
        <div className="hidden md:flex md:w-[42%] bg-slate-950 text-white p-12 flex-col justify-between relative overflow-hidden h-screen sticky top-0">
          {/* Banner Image Background */}
          <div className="absolute inset-0 z-0">
            <img
              src="/auth_banner.png"
              alt="Art Banner"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/20" />
          </div>

          {/* Top content */}
          <div className="relative z-10 flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-widest text-orange-200/90 font-mono uppercase">
              {randomQuote.category}
            </span>
            <div className="h-[1px] flex-1 bg-white/20 max-w-[80px]" />
          </div>

          {/* Bottom text */}
          <div className="relative z-10 space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight font-sans">
              {randomQuote.title}
            </h1>
            <p className="text-xs leading-relaxed text-slate-300 font-mono max-w-[280px]">
              {randomQuote.text}
            </p>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="w-full md:w-[58%] flex flex-col justify-between p-8 sm:p-12 md:p-16 bg-white relative z-10 min-h-screen">
          {/* Header logo / brand name - Centered */}
          <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-850">
            <img src="/logo.png" alt="QwenWeaver Logo" className="h-5 w-5 object-contain" />
            <span className="tracking-tight font-sans">QwenWeaver</span>
          </div>

          {/* Form and central message */}
          <div className="my-auto py-6 max-w-sm w-full mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-500 font-sans font-medium">
                {isLogin
                  ? 'Enter your email and password to access your account'
                  : 'Enter your details below to create a new account'}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs font-mono text-rose-600 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-850 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-10 text-xs text-slate-850 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-slate-350 text-slate-900 focus:ring-slate-900 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-slate-500 hover:text-slate-800 transition-colors font-medium"
                >
                  Forgot Password
                </a>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 tracking-wide disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
              >
                {isLoading
                  ? isLogin
                    ? 'Signing in...'
                    : 'Registering...'
                  : isLogin
                    ? 'Sign In'
                    : 'Sign Up'}
              </button>

              {/* Google OAuth Option */}
              <button
                type="button"
                onClick={() => {
                  setEmail('demo@qwenweaver.ai');
                  setPassword('password123');
                }}
                className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-2 tracking-wide transition-colors cursor-pointer shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isLogin ? 'Sign In with Google' : 'Sign Up with Google'}
              </button>
            </form>
          </div>

          {/* Footer toggle link */}
          <div className="text-center text-xs text-slate-500 mt-auto md:mt-0 pt-4">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-bold text-slate-900 hover:underline cursor-pointer transition-all"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
