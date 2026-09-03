// ── Forgot Password Page (3-step: email → OTP → new password) ────────────────
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, CheckCircle, Eye, EyeOff, Mail, KeyRound, Lock } from 'lucide-react';
import AuthLayout from '@/layouts/AuthLayout';
import { authService } from '@/services/authService';

// ── Step schemas ──────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, 'Enter the 6-digit code')
    .regex(/^\d+$/, 'Code must be numeric'),
});

const newPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type EmailForm = z.infer<typeof emailSchema>;
type OTPForm = z.infer<typeof otpSchema>;
type NewPasswordForm = z.infer<typeof newPasswordSchema>;

// ── Password strength (reused from RegisterPage) ──────────────────────────────
type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function scorePassword(pw: string): StrengthLevel {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s as StrengthLevel;
}

const STRENGTH_LABEL: Record<StrengthLevel, string> = { 0: '', 1: 'Weak', 2: 'Fair', 3: 'Good', 4: 'Strong' };
const STRENGTH_BAR: Record<StrengthLevel, string> = { 0: 'bg-[#E5E7EB]', 1: 'bg-red-500', 2: 'bg-amber-400', 3: 'bg-blue-500', 4: 'bg-green-500' };
const STRENGTH_TEXT: Record<StrengthLevel, string> = { 0: '', 1: 'text-red-600', 2: 'text-amber-600', 3: 'text-blue-600', 4: 'text-green-600' };

function PasswordStrengthBar({ password }: { password: string }) {
  const score = scorePassword(password);
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              score >= i ? STRENGTH_BAR[score] : 'bg-[#E5E7EB] dark:bg-white/10'
            }`}
          />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs font-medium ${STRENGTH_TEXT[score]}`}>{STRENGTH_LABEL[score]}</p>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

type Step = 'email' | 'otp' | 'new-password' | 'done';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Carry email + otp across steps so we can post them together on reset
  const [savedEmail, setSavedEmail] = useState('');
  const [savedOtp, setSavedOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Dev-only: OTP returned directly in API response when APP_ENV=development
  const [devOtp, setDevOtp] = useState('');

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const otpForm = useForm<OTPForm>({ resolver: zodResolver(otpSchema) });
  const passwordForm = useForm<NewPasswordForm>({ resolver: zodResolver(newPasswordSchema) });

  const newPasswordValue = passwordForm.watch('new_password', '');

  // ── Step 1: send OTP ────────────────────────────────────────────────────────
  const onEmailSubmit = async (data: EmailForm) => {
    setLoading(true);
    setError('');
    try {
      const res = await authService.forgotPassword({ email: data.email });
      setSavedEmail(data.email);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
        otpForm.setValue('otp', res.dev_otp); // pre-fill the OTP field
      }
      setStep('otp');
    } catch (err: any) {
      // Always advance — backend never reveals whether email exists
      setSavedEmail(data.email);
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ──────────────────────────────────────────────────────
  const onOtpSubmit = async (data: OTPForm) => {
    setLoading(true);
    setError('');
    try {
      await authService.verifyOTP({ email: savedEmail, otp: data.otp });
      setSavedOtp(data.otp);
      setStep('new-password');
    } catch (err: any) {
      setError(err.message ?? 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: set new password ────────────────────────────────────────────────
  const onPasswordSubmit = async (data: NewPasswordForm) => {
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword({ email: savedEmail, otp: savedOtp, new_password: data.new_password });
      setStep('done');
    } catch (err: any) {
      setError(err.message ?? 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator ──────────────────────────────────────────────────────────
  const stepIndex = { email: 1, otp: 2, 'new-password': 3, done: 3 }[step];

  const StepDots = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            n < stepIndex ? 'w-6 bg-green-500' :
            n === stepIndex ? 'w-6 bg-[#0F172A] dark:bg-[#E2E8F0]' :
            'w-3 bg-[#E5E7EB] dark:bg-white/20'
          }`}
        />
      ))}
    </div>
  );

  // ── Error banner ────────────────────────────────────────────────────────────
  const ErrorBanner = () => error ? (
    <div role="alert" className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700/30 dark:text-red-300 rounded-lg p-3 mb-4 flex items-start gap-2 text-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
      <span>{error}</span>
    </div>
  ) : null;

  // ── Done screen ─────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <AuthLayout>
        <div className="text-center py-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#E2E8F0] mb-2">Password updated!</h2>
          <p className="text-sm text-[#9CA3AF] dark:text-[#94A3B8] mb-6">
            Your password has been changed. Please sign in with your new password.
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="btn-primary w-full"
          >
            Sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  // ── Step 1: email ────────────────────────────────────────────────────────────
  if (step === 'email') {
    return (
      <AuthLayout>
        <StepDots />
        <div className="flex justify-center mb-4">
          <Mail className="w-8 h-8 text-[#0F172A] dark:text-[#94A3B8]" />
        </div>
        <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#E2E8F0] mb-1 text-center">Forgot password?</h2>
        <p className="text-sm text-[#9CA3AF] dark:text-[#94A3B8] mb-6 text-center">
          Enter your email and we'll send you a 6-digit reset code.
        </p>

        <ErrorBanner />

        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              {...emailForm.register('email')}
              className="input"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />
            {emailForm.formState.errors.email && (
              <p className="text-xs text-red-600 mt-1" role="alert">{emailForm.formState.errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Sending…</> : 'Send reset code'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link to="/login" className="text-sm text-[#0F172A] dark:text-[#94A3B8] hover:underline">
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Step 2: OTP ──────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <AuthLayout>
        <StepDots />
        <div className="flex justify-center mb-4">
          <KeyRound className="w-8 h-8 text-[#0F172A] dark:text-[#94A3B8]" />
        </div>
        <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#E2E8F0] mb-1 text-center">Enter reset code</h2>
        <p className="text-sm text-[#9CA3AF] dark:text-[#94A3B8] mb-2 text-center">
          If <span className="font-medium text-[#0F172A] dark:text-[#E2E8F0]">{savedEmail}</span> is registered,
          a 6-digit code has been sent. Check your inbox (and spam folder).
        </p>
        <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mb-6 text-center">The code expires in 10 minutes.</p>

        <ErrorBanner />

        {/* Dev-only OTP banner — invisible in production (dev_otp is null when APP_ENV != development) */}
        {devOtp && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/40 p-3 mb-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
              Dev mode — OTP (not sent by email)
            </p>
            <p className="text-2xl font-mono font-bold tracking-[0.3em] text-amber-800 dark:text-amber-300 text-center py-1">
              {devOtp}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-500 text-center mt-0.5">
              This banner is invisible when SMTP is configured
            </p>
          </div>
        )}

        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="otp" className="label">6-digit code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              {...otpForm.register('otp')}
              className="input text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
              disabled={loading}
            />
            {otpForm.formState.errors.otp && (
              <p className="text-xs text-red-600 mt-1" role="alert">{otpForm.formState.errors.otp.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Verifying…</> : 'Verify code'}
          </button>
        </form>

        <div className="text-center mt-4 space-y-2">
          <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8]">
            Didn't receive it?{' '}
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); otpForm.reset(); }}
              className="text-[#0F172A] dark:text-[#94A3B8] underline hover:no-underline text-xs"
            >
              Send a new code
            </button>
          </p>
          <Link to="/login" className="block text-sm text-[#0F172A] dark:text-[#94A3B8] hover:underline">
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Step 3: new password ──────────────────────────────────────────────────────
  return (
    <AuthLayout>
      <StepDots />
      <div className="flex justify-center mb-4">
        <Lock className="w-8 h-8 text-[#0F172A] dark:text-[#94A3B8]" />
      </div>
      <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#E2E8F0] mb-1 text-center">Set new password</h2>
      <p className="text-sm text-[#9CA3AF] dark:text-[#94A3B8] mb-6 text-center">
        Choose a strong password you haven't used before.
      </p>

      <ErrorBanner />

      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="new_password" className="label">New password</label>
          <div className="relative">
            <input
              id="new_password"
              type={showPassword ? 'text' : 'password'}
              {...passwordForm.register('new_password')}
              className="input pr-10"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563] dark:hover:text-[#94A3B8] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
            </button>
          </div>
          <PasswordStrengthBar password={newPasswordValue} />
          {passwordForm.formState.errors.new_password && (
            <p className="text-xs text-red-600 mt-1" role="alert">{passwordForm.formState.errors.new_password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirm_password" className="label">Confirm new password</label>
          <input
            id="confirm_password"
            type="password"
            {...passwordForm.register('confirm_password')}
            className="input"
            placeholder="Repeat your new password"
            autoComplete="new-password"
            disabled={loading}
          />
          {passwordForm.formState.errors.confirm_password && (
            <p className="text-xs text-red-600 mt-1" role="alert">{passwordForm.formState.errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Updating…</> : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  );
}
