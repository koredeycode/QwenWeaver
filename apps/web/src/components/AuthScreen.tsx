import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  Cpu, 
  ArrowRight, 
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../store/index.js';

export const AuthScreen = () => {
  const login = useStore((s) => s.login);
  const register = useStore((s) => s.register);
  const setMockMode = useStore((s) => s.setMockMode);
  const token = useStore((s) => s.token);
  const mockMode = useStore((s) => s.mockMode);

  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated or in mockMode, redirect to dashboard automatically
  useEffect(() => {
    if (token || mockMode) {
      navigate('/');
    }
  }, [token, mockMode, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // Toggle off mock mode initially for real login attempts
      setMockMode(false);
      
      const success = isLogin 
        ? await login(email, password)
        : await register(email, password);

      if (success) {
        navigate('/');
      } else {
        setError(isLogin ? 'Invalid credentials.' : 'Registration failed.');
      }
    } catch (err) {
      setError('Authentication failed. Check your API connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoMode = () => {
    setMockMode(true);
    navigate('/');
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
          {isLogin ? 'Initialize System Access' : 'Create System Account'}
        </h2>
        <p className="text-xs text-slate-500 font-mono mb-6">
          {isLogin ? 'Provide JWT credentials for local node sync' : 'Register credentials on the database controller'}
        </p>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-xs font-mono text-rose-600">
            [SYS ERROR]: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-[#cbd5e1] p-2.5 text-xs text-slate-800 outline-none rounded-none focus:border-secondary"
              placeholder="operator@qwenweaver.dev"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> SECURITY PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-[#cbd5e1] p-2.5 text-xs text-slate-800 outline-none rounded-none focus:border-secondary"
              placeholder="••••••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-[#9a3412] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center justify-center gap-2 tracking-wide disabled:opacity-50"
          >
            {isLoading ? 'ESTABLISHING HANDSHAKE...' : isLogin ? 'ESTABLISH HANDSHAKE' : 'CREATE OPERATOR IDENT'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-mono">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            {isLogin ? 'Need an account? Sign up' : 'Already registered? Sign in'}
          </button>
        </div>

        {/* Demo Mode trigger */}
        <div className="mt-4 pt-4 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-400 font-mono mb-2">Want to test the app instantly without databases?</p>
          <button
            type="button"
            onClick={handleDemoMode}
            className="w-full py-2 bg-[#2563eb]/10 hover:bg-[#2563eb]/20 border border-[#2563eb]/30 text-xs font-mono font-bold text-[#2563eb] flex items-center justify-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            BYPASS AUTH (DEMO MOCK MODE)
          </button>
        </div>
      </div>
    </div>
  );
};
