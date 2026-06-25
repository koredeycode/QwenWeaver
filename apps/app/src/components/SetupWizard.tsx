import { useState, useEffect } from 'react';
import { Cpu, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { SetupOwner } from './SetupOwner.js';
import { SetupRuntime } from './SetupRuntime.js';
import { SetupComplete } from './SetupComplete.js';
import { client2, authHeaders } from '../lib/api-client.js';

const STEPS = [
  { key: 'owner', label: 'Admin', description: 'Create the admin account' },
  { key: 'runtime', label: 'Config', description: 'Configure runtime settings' },
  { key: 'done', label: 'Done', description: 'All set' },
];

interface SetupStatus {
  complete: boolean;
  ownerExists: boolean;
  runtimeConfig?: {
    dbPath: string;
  };
}

export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    client2.api.setup.status
      .$get({}, { headers: authHeaders() })
      .then((res: Response) => res.json())
      .then((data: SetupStatus) => {
        setStatus(data);
        if (data.ownerExists) {
          setStep(1);
        }
      })
      .catch(() => setStatus({ complete: false, ownerExists: false }))
      .finally(() => setLoading(false));
  }, []);

  const handleOwnerSubmit = (data: { email: string; password: string }) => {
    setError('');
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      owner: { email: data.email, password: data.password },
    };

    if (status?.runtimeConfig) {
      payload.runtime = {
        databaseUrl: status.runtimeConfig.dbPath,
      };
    }

    client2.api.setup
      .$post({ json: payload }, { headers: authHeaders() })
      .then(async (res: Response) => {
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || 'Setup failed');
        }
        setStep(1);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSubmitting(false));
  };

  const handleRuntimeSubmit = (data: Record<string, unknown>) => {
    setError('');
    setSubmitting(true);

    const payload = { runtime: data };

    client2.api.setup
      .$post({ json: payload }, { headers: authHeaders() })
      .then(async (res: Response) => {
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || 'Setup failed');
        }
        setStep(2);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <p className="text-sm font-mono text-slate-500">Could not reach the server.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-slate-50 font-sans overflow-y-auto z-50">
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

      <div className="w-full max-w-lg bg-white border-2 border-slate-200 p-8 shadow-xl relative z-10 my-8">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-6 h-6 text-[#ea580c]" />
          <span className="text-sm font-mono font-bold tracking-wider text-[#ea580c]">
            QWENWEAVER
          </span>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
          {status?.ownerExists ? 'Configure' : 'Get Started'}
        </h2>
        <p className="text-xs text-slate-500 font-mono mb-6">
          {status?.ownerExists
            ? 'Update your runtime configuration.'
            : 'Set up your QwenWeaver instance.'}
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center border text-xs font-bold font-mono ${
                    i === step
                      ? 'border-[#ea580c] bg-[#ea580c] text-white'
                      : i < step
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-widest ${
                    i === step ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-8 bg-slate-200" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-xs font-mono text-rose-600">
            {error}
          </div>
        )}

        {/* Loading overlay during submission */}
        {submitting ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#ea580c]" />
          </div>
        ) : (
          <>
            {step === 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-4">Create Admin Account</h3>
                <SetupOwner onSubmit={handleOwnerSubmit} />
              </div>
            )}

            {step === 1 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-4">Runtime Configuration</h3>
                <p className="text-xs text-slate-500 font-mono mb-4">
                  These settings are written to your <code>.env</code> file. All fields are optional
                  — leaving them blank keeps existing values.
                </p>
                <SetupRuntime onSubmit={handleRuntimeSubmit} />
              </div>
            )}

            {step === 2 && <SetupComplete />}
          </>
        )}

        {/* Back button for step 1+ */}
        {step > 0 && step < 2 && !submitting && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
