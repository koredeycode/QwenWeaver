import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface SetupOwnerProps {
  onSubmit: (data: { email: string; password: string }) => void;
  initialEmail?: string;
}

export function SetupOwner({ onSubmit, initialEmail = '' }: SetupOwnerProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    onSubmit({ email: email.trim(), password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white border border-[#cbd5e1] p-2.5 text-sm text-slate-800 outline-none focus:border-secondary"
          placeholder="admin@example.com"
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
            className="w-full bg-white border border-[#cbd5e1] p-2.5 pr-10 text-sm text-slate-800 outline-none focus:border-secondary"
            placeholder="At least 8 characters"
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

      <div className="space-y-1">
        <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" /> Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-white border border-[#cbd5e1] p-2.5 text-sm text-slate-800 outline-none focus:border-secondary"
          placeholder="Repeat your password"
          required
        />
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-xs font-mono text-rose-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="w-full py-2.5 bg-[#9a3412] hover:bg-[#a73a00] text-white font-bold text-xs flex items-center justify-center gap-2 tracking-wide cursor-pointer"
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
