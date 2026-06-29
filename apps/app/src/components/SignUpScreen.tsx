import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store/index.js';
import { authClient } from '../lib/api-client.js';

const QUOTES = [
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

export const SignUpScreen = () => {
  const register = useStore((s) => s.register);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();

  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const success = await register(email, password, name);
      if (success) navigate('/');
      else setError('Registration failed. Email may already be in use.');
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex bg-slate-950 font-sans select-none overflow-hidden text-slate-800 z-50">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />
      <div className="w-full h-full flex flex-row relative">
        <div className="hidden md:flex md:w-[42%] bg-slate-950 text-white flex-col justify-between relative overflow-hidden h-full sticky top-0">
          <div className="absolute inset-0 z-0">
            <img src="/auth_banner.png" alt="" className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/20" />
          </div>
          <div className="relative z-10 flex items-center gap-3 p-12">
            <span className="text-[10px] font-bold tracking-widest text-orange-200/90 font-mono uppercase">
              {quote.category}
            </span>
            <div className="h-[1px] flex-1 bg-white/20 max-w-[80px]" />
          </div>
          <div className="relative z-10 space-y-4 p-12">
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight font-sans">
              {quote.title}
            </h1>
            <p className="text-xs leading-relaxed text-slate-300 font-mono max-w-[280px]">
              {quote.text}
            </p>
          </div>
        </div>

        <div className="w-full md:w-[58%] flex flex-col justify-center p-8 sm:p-12 md:p-16 bg-white relative z-10 h-full overflow-hidden">
          <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-850 mb-6">
            <img src="/logo.png" alt="QwenWeaver" className="h-5 w-5 object-contain" />
            <span className="tracking-tight font-sans">QwenWeaver</span>
          </div>

          <div className="max-w-sm w-full mx-auto space-y-5">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
                Create Account
              </h2>
              <p className="text-xs text-slate-500 font-sans font-medium">
                Enter your details below to create a new account
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs font-mono text-rose-600 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-850 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                  placeholder="Enter your name"
                  required
                />
              </div>

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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-10 text-xs text-slate-850 outline-none focus:border-slate-400 focus:bg-white transition-colors"
                    placeholder="At least 8 characters"
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 tracking-wide disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
              >
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </button>

              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  or continue with
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => authClient.signIn.social({ provider: 'google' })}
                  className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
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
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => authClient.signIn.social({ provider: 'github' })}
                  className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  GitHub
                </button>
              </div>
            </form>
          </div>

          <div className="text-center text-xs text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/signin" className="font-bold text-slate-900 hover:underline transition-all">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
