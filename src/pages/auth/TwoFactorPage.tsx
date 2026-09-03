// ── Two-Factor Authentication Page ───────────────────────────────────────────
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  totp_code: z
    .string()
    .length(6, 'Enter the 6-digit code from your authenticator app')
    .regex(/^\d+$/, 'Code must be numeric'),
});

type FormValues = z.infer<typeof schema>;

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const partial_token = (location.state as any)?.partial_token ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!partial_token) {
    return (
      <AuthLayout>
        <div className="text-center">
          <p className="text-sm text-[#9CA3AF] mb-4">Session expired. Please sign in again.</p>
          <Link to="/login" className="btn-primary">Back to sign in</Link>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError('');
    try {
      const response = await authService.verify2FA({ partial_token, totp_code: data.totp_code });
      setAuth(response.user, response.token);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex justify-center mb-4">
        <ShieldCheck className="w-10 h-10 text-[#0F172A] dark:text-[#94A3B8]" />
      </div>
      <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#E2E8F0] mb-1 text-center">
        Two-factor authentication
      </h2>
      <p className="text-sm text-[#9CA3AF] mb-6 text-center">
        Enter the 6-digit code from your authenticator app.
      </p>

      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 text-red-700 dark:text-red-300 rounded-xl p-3 mb-4 flex items-start gap-2 text-sm fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="totp_code" className="label">Authenticator code</label>
          <input
            id="totp_code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            {...register('totp_code')}
            className="input text-center text-2xl tracking-widest font-mono"
            placeholder="000000"
            autoComplete="one-time-code"
            disabled={loading}
            autoFocus
          />
          {errors.totp_code && <p className="text-xs text-red-600 mt-1" role="alert">{errors.totp_code.message}</p>}
        </div>

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Verifying…</> : 'Verify'}
        </button>
      </form>

      <div className="text-center mt-6">
        <Link to="/login" className="text-sm text-[#9CA3AF] hover:underline">Back to sign in</Link>
      </div>
    </AuthLayout>
  );
}
