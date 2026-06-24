import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  Cpu, 
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { apiFetch, isSelfHosted } from '../lib/api-client.js';

export const AuthScreen = () => {
  const login = useStore((s) => s.login);
  const register = useStore((s) => s.register);
  const token = useStore((s) => s.token);

  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Check if setup is complete; if not, redirect to /setup (self-host only)
  useEffect(() => {
    if (!isSelfHosted()) {
      setCheckingSetup(false);
      return;
    }
    apiFetch('/api/setup/status')
      .then((res) => res.json())
      .then((data: { complete: boolean }) => {
        if (!data.complete) {
          navigate('/setup', { replace: true });
        }
      })
      .catch(() => {
        // Server unreachable — stay on login page
      })
      .finally(() => setCheckingSetup(false));
  }, [navigate]);

  // If already authenticated, redirect to dashboard automatically
  useEffect(() => {
    if (token && !checkingSetup) {
      navigate('/');
    }
  }, [token, navigate, checkingSetup]);

  if (checkingSetup) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const success = isLogin 
        ? await login(email, password)
        : await register(email, password);

      if (success) {
        navigate('/');
      } else {
        setError(isLogin ? 'Invalid email or password.' : 'Registration failed.');
      }
    } catch (err) {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-slate-50 font-sans select-none overflow-hidden text-slate-800 z-50">
      {/* Background dot grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

      {/* Main card */}
      <div className="w-96 bg-white border-2 border-slate-200 p-8 shadow-xl relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-6 h-6 text-[#ea580c]" />
          <span className="text-sm font-mono font-bold tracking-wider text-[#ea580c]">QWENWEAVER v0.1.0</span>
        </div>
        
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
          {isLogin ? 'Sign in' : 'Create account'}
        </h2>
        <p className="text-xs text-slate-500 font-mono mb-6">
          {isLogin ? 'Enter your credentials to continue.' : 'Register a new account to get started.'}
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-xs font-mono text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-[#cbd5e1] p-2.5 text-xs text-slate-800 outline-none rounded-none focus:border-secondary"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#cbd5e1] p-2.5 pr-10 text-xs text-slate-800 outline-none rounded-none focus:border-secondary"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-[#9a3412] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center justify-center gap-2 tracking-wide disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Signing in...' : isLogin ? 'Sign in' : 'Create account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-mono">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
