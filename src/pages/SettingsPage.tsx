// ── Settings Page ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { User, Shield, LogOut, ShieldCheck, ShieldOff, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { FinancialCard } from '@/components/ui/FinancialCard';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  // ── 2FA state machine: idle | setup | confirm | disable ───────────────────
  const [twoFAPhase, setTwoFAPhase] = useState<'idle' | 'setup' | 'confirm' | 'disable'>('idle');
  const [qrUri, setQrUri] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState('');

  const codeSchema = z.object({ totp_code: z.string().length(6, 'Enter the 6-digit code').regex(/^\d+$/, 'Numeric only') });
  type CodeForm = z.infer<typeof codeSchema>;
  const confirmForm = useForm<CodeForm>({ resolver: zodResolver(codeSchema) });
  const disableForm = useForm<CodeForm>({ resolver: zodResolver(codeSchema) });

  const handleLogout = async () => {
    await authService.logout();
    clearAuth();
    navigate('/login', { replace: true });
  };

  const startEnable2FA = async () => {
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      const res = await authService.enable2FA();
      setQrUri(res.qr_uri);
      setTotpSecret(res.secret);
      setTwoFAPhase('setup');
    } catch (err: any) {
      setTwoFAError(err.message ?? 'Failed to start 2FA setup.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const onConfirm2FA = async (data: CodeForm) => {
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      await authService.confirm2FA({ totp_code: data.totp_code });
      toast.success('Two-factor authentication enabled!');
      setTwoFAPhase('idle');
      // Update user in store
      if (user) setAuth({ ...user, totpEnabled: true }, token ?? '');
    } catch (err: any) {
      setTwoFAError(err.message ?? 'Invalid code. Please try again.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const onDisable2FA = async (data: CodeForm) => {
    setTwoFALoading(true);
    setTwoFAError('');
    try {
      await authService.disable2FA({ totp_code: data.totp_code });
      toast.success('Two-factor authentication disabled.');
      setTwoFAPhase('idle');
      if (user) setAuth({ ...user, totpEnabled: false }, token ?? '');
    } catch (err: any) {
      setTwoFAError(err.message ?? 'Invalid code.');
    } finally {
      setTwoFALoading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in max-w-2xl">
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {/* Profile card */}
      <FinancialCard title="Profile">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', boxShadow: '0 4px 12px rgba(15,23,42,0.20)' }}
          >
            {user?.name.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">{user?.name ?? 'User'}</p>
            <p className="text-sm text-[#9CA3AF] dark:text-[#94A3B8]">{user?.email ?? ''}</p>
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#F3F4F6] text-[#4B5563] dark:bg-white/10 dark:text-[#94A3B8]">
              Student Account
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Full Name', value: user?.name ?? '', icon: User },
            { label: 'Email', value: user?.email ?? '', icon: User },
          ].map((f) => (
            <div key={f.label}>
              <label className="label">{f.label}</label>
              <input type="text" defaultValue={f.value} className="input" readOnly />
            </div>
          ))}
          <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8]">
            Profile editing will be available once the backend is connected.
          </p>
        </div>
      </FinancialCard>

      {/* Notifications */}
      <FinancialCard title="Notifications">
        <div className="space-y-0.5">
          {[
            { label: 'Budget alerts', description: 'Notify when a budget category exceeds 80%' },
            { label: 'Scholarship deadlines', description: 'Remind 7 days before scholarship deadlines' },
            { label: 'Monthly summary', description: 'Monthly financial summary digest' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3 border-b border-[#E5E7EB] dark:border-white/8 last:border-0">
              <div>
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]">{item.label}</p>
                <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8]">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0" aria-label={`Toggle ${item.label}`}>
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 bg-zinc-200 dark:bg-white/20 peer-checked:bg-[#0F172A] rounded-full transition-colors duration-200" />
                <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform duration-200" />
              </label>
            </div>
          ))}
        </div>
      </FinancialCard>

      {/* Security */}
      <FinancialCard title="Security">
        <div className="space-y-4">
          {/* Password row */}
          <div className="flex items-center justify-between py-2 border-b border-[#E5E7EB] dark:border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#F3F4F6] dark:bg-white/8 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#4B5563] dark:text-[#94A3B8]" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]">Password</p>
                <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8]">Change via "Forgot password" on the login page</p>
              </div>
            </div>
          </div>

          {/* 2FA row */}
          <div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#F3F4F6] dark:bg-white/8 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#4B5563] dark:text-[#94A3B8]" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]">Two-factor authentication</p>
                  <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8]">
                    {user?.totpEnabled ? 'Enabled — using authenticator app' : 'Add an extra layer of security'}
                  </p>
                </div>
              </div>
              {twoFAPhase === 'idle' && (
                user?.totpEnabled ? (
                  <button onClick={() => { setTwoFAPhase('disable'); setTwoFAError(''); }} className="btn-secondary text-xs">Disable</button>
                ) : (
                  <button onClick={startEnable2FA} disabled={twoFALoading} className="btn-secondary text-xs flex items-center gap-1">
                    {twoFALoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Enable
                  </button>
                )
              )}
            </div>

            {/* 2FA error */}
            {twoFAError && (
              <p className="text-xs text-red-600 mt-1">{twoFAError}</p>
            )}

            {/* Setup phase: show QR + secret */}
            {twoFAPhase === 'setup' && (
              <div className="mt-4 space-y-4 p-4 bg-[#F7F8FA] dark:bg-white/5 rounded-xl border border-[#E5E7EB] dark:border-white/10">
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]">1. Scan this QR code with your authenticator app</p>
                <img src={qrUri} alt="2FA QR code" className="w-40 h-40 rounded-lg" />
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Or enter this key manually:</p>
                  <code className="text-xs font-mono bg-[#E5E7EB] dark:bg-white/10 px-2 py-1 rounded break-all">{totpSecret}</code>
                </div>
                <button onClick={() => setTwoFAPhase('confirm')} className="btn-primary text-sm">Next: Verify code</button>
                <button onClick={() => setTwoFAPhase('idle')} className="text-xs text-[#9CA3AF] hover:underline ml-3">Cancel</button>
              </div>
            )}

            {/* Confirm phase: enter first code */}
            {twoFAPhase === 'confirm' && (
              <form onSubmit={confirmForm.handleSubmit(onConfirm2FA)} className="mt-4 space-y-3 p-4 bg-[#F7F8FA] dark:bg-white/5 rounded-xl border border-[#E5E7EB] dark:border-white/10">
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]">2. Enter the 6-digit code to confirm</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  {...confirmForm.register('totp_code')}
                  className="input text-center font-mono tracking-widest text-lg"
                  placeholder="000000"
                  autoFocus
                />
                {confirmForm.formState.errors.totp_code && <p className="text-xs text-red-600">{confirmForm.formState.errors.totp_code.message}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={twoFALoading} className="btn-primary text-sm flex items-center gap-1">
                    {twoFALoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}Confirm
                  </button>
                  <button type="button" onClick={() => { setTwoFAPhase('idle'); confirmForm.reset(); }} className="btn-secondary text-sm">Cancel</button>
                </div>
              </form>
            )}

            {/* Disable phase: confirm with current code */}
            {twoFAPhase === 'disable' && (
              <form onSubmit={disableForm.handleSubmit(onDisable2FA)} className="mt-4 space-y-3 p-4 bg-[#F7F8FA] dark:bg-white/5 rounded-xl border border-[#E5E7EB] dark:border-white/10">
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]">Enter your authenticator code to disable 2FA</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  {...disableForm.register('totp_code')}
                  className="input text-center font-mono tracking-widest text-lg"
                  placeholder="000000"
                  autoFocus
                />
                {disableForm.formState.errors.totp_code && <p className="text-xs text-red-600">{disableForm.formState.errors.totp_code.message}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={twoFALoading} className="btn-secondary text-sm flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50">
                    {twoFALoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}Disable 2FA
                  </button>
                  <button type="button" onClick={() => { setTwoFAPhase('idle'); disableForm.reset(); }} className="btn-secondary text-sm">Cancel</button>
                </div>
              </form>
            )}
          </div>

          <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] leading-relaxed">
            Your session token is stored only for the current browser session and is cleared when you close the tab.
          </p>
        </div>
      </FinancialCard>

      {/* App Info */}
      <FinancialCard title="About">
        <div className="space-y-0.5">
          {[
            { label: 'Application', value: 'FinWise AI' },
            { label: 'Version', value: '0.1.0' },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-[#E5E7EB] dark:border-white/8 last:border-0">
              <span className="text-sm text-[#4B5563] dark:text-[#94A3B8]">{item.label}</span>
              <span className="text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]">{item.value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm text-[#4B5563] dark:text-[#94A3B8]">Backend status</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              Mock Mode
            </span>
          </div>
          <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mt-1 leading-relaxed">
            Currently running with mock data. Connect the FastAPI backend to use live data.
          </p>
        </div>
      </FinancialCard>

      {/* Account Actions */}
      <div className="card border-red-200/60 dark:border-red-700/20 bg-red-50/50 dark:bg-red-900/5">
        <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">Account Actions</h3>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium
            hover:text-red-800 dark:hover:text-red-300 transition-colors
            px-3 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20"
        >
          <LogOut className="w-4 h-4" aria-hidden /> Sign out of FinWise AI
        </button>
      </div>
    </div>
  );
}
