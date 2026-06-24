import { Cpu, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SetupComplete() {
  const navigate = useNavigate();

  return (
    <div className="text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <Cpu className="h-8 w-8 text-emerald-600" />
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Setup Complete
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-mono">
          QwenWeaver is configured and ready. Sign in with your admin credentials.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-xs font-mono text-slate-600 space-y-1">
        <p>✓ Owner account created</p>
        <p>✓ Runtime configuration applied</p>
        <p>✓ Ready to build multi-agent workflows</p>
      </div>

      <button
        onClick={() => navigate('/login')}
        className="inline-flex items-center gap-2 py-2.5 px-6 bg-[#9a3412] hover:bg-[#a73a00] text-white font-bold text-xs tracking-wide cursor-pointer"
      >
        Go to Sign In
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
