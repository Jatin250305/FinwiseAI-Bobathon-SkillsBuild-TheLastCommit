// ── Email OTP Verification Page (signup flow) ─────────────────────────────────
// Shown right after registration. User enters the 6-digit code emailed to them.
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, CheckCircle, Mail, RefreshCw } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

const RESEND_COOLDOWN = 60; // seconds — must match backend RESEND_COOLDOWN_SECONDS

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'Enter the 6-digit code')
    .regex(/^\d+$/, 'Code must be numeric'),
});
type OTPForm = z.infer<typeof otpSchema>;

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Email + optional dev_otp are passed via router state from RegisterPage / LoginPage
  const email: string  = (location.state as any)?.email   ?? '';
  const devOtp: string = (location.state as any)?.dev_otp ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Dev-only: mutable display of current OTP (updates on resend)
  const [devOtpDisplay, setDevOtpDisplay] = useState(devOtp);

  // Start cooldown timer on mount
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendCooldown((n) => {
        if (n <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResendCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setResendCooldown((n) => {
        if (n <= 1) { clearInterval(timerRef.current!); return 0; }
        return n - 1;
      });
    }, 1000);
  };

  const {
    register,
    handleSubmit,
    setFocus,
    setValue,
    formState: { errors },
  } = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: devOtp }, // pre-fill from dev_otp if present
  });

  // If no email in state, redirect to register
  if (!email) {
    return (
      <AuthLayout>
        <div className="text-center py-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#E2E8F0] mb-2">Session expired</h2>
          <p className="text-sm text-[#9CA3AF] dark:text-[#94A3B8] mb-6">
            Please register again to receive a new verification code.
          </p>
          <Link to="/register" className="btn-primary">Go to register</Link>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: OTPForm) => {
    setLoading(true);
    setError('');
    try {
      const response = await authService.verifySignupOTP({ email, otp: data.otp });
      setSuccess(true);
      setAuth(response.user, response.token);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1800);
    } catch (err: any) {
      setError(err.message ?? 'Invalid or expired code. Please try again.');
      // Re-focus input for next attempt
      setTimeout(() => setFocus('otp'), 50);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const res = await authService.resendSignupOTP({ email });
      if (res.dev_otp) {
        setValue('otp', res.dev_otp);       // auto-fill the new code
        setDevOtpDisplay(res.dev_otp);
      }
      setResendMsg('A new code has been sent.');
      resetTimer();
    } catch (err: any) {
      setError(err.message ?? 'Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#E2E8F0] mb-2">Email verified!</h2>
          <p className="text-sm text-[#9CA3AF] dark:text-[#94A3B8] mb-6">
            Your account is now active. Taking you to your dashboard…
          </p>
          <Link to="/dashboard" className="btn-primary">Go to dashboard</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {/* Icon + heading */}
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] dark:bg-white/8 flex items-center justify-center">
          <Mail className="w-6 h-6 text-[#0F172A] dark:text-[#94A3B8]" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#E2E8F0] mb-1 text-center">
        Check your email
      </h2>
      <p className="text-sm text-[#9CA3AF] dark:text-[#94A3B8] mb-1 text-center">
        We sent a 6-digit code to
      </p>
      <p className="text-sm font-semibold text-[#0F172A] dark:text-[#E2E8F0] mb-6 text-center truncate">
        {email}
      </p>

      {/* Dev-only OTP banner — hidden in production (dev_otp is null when APP_ENV != development) */}
      {devOtpDisplay && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/40 p-3 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
            Dev mode — OTP (not sent by email)
          </p>
          <p className="text-2xl font-mono font-bold tracking-[0.3em] text-amber-800 dark:text-amber-300 text-center py-1">
            {devOtpDisplay}
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-500 text-center mt-0.5">
            This banner is invisible when SMTP is configured
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 text-red-700 dark:text-red-300 rounded-xl p-3 mb-4 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* Resend success */}
      {resendMsg && !error && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-300 rounded-xl p-3 mb-4 flex items-start gap-2 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
          <span>{resendMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="otp" className="label">Verification code</label>
          <input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            {...register('otp')}
            className="input text-center text-3xl tracking-[0.35em] font-mono"
            placeholder="000000"
            autoComplete="one-time-code"
            autoFocus
            disabled={loading}
          />
          {errors.otp && (
            <p className="text-xs text-red-600 mt-1" role="alert">{errors.otp.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Verifying…</>
            : 'Verify email'
          }
        </button>
      </form>

      {/* Resend */}
      <div className="mt-5 text-center">
        <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mb-2">
          Didn't receive it? Check your spam folder or
        </p>
        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0 || resending}
          className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
            resendCooldown > 0 || resending
              ? 'text-[#C4C9D4] dark:text-[#4B5563] cursor-not-allowed'
              : 'text-[#0F172A] dark:text-[#94A3B8] hover:underline cursor-pointer'
          }`}
        >
          {resending
            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden />Sending…</>
            : resendCooldown > 0
            ? <>Resend code in {resendCooldown}s</>
            : <><RefreshCw className="w-3.5 h-3.5" aria-hidden />Resend code</>
          }
        </button>
      </div>

      <div className="text-center mt-4">
        <Link to="/login" className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] hover:underline">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
