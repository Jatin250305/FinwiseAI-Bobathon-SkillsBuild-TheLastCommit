// ── Register Page ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import AuthLayout from '@/layouts/AuthLayout';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

// ── Password strength ─────────────────────────────────────────────────────────
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
const STRENGTH_BAR:   Record<StrengthLevel, string> = { 0: 'bg-[#E5E7EB]', 1: 'bg-red-500', 2: 'bg-amber-400', 3: 'bg-blue-500', 4: 'bg-green-500' };
const STRENGTH_TEXT:  Record<StrengthLevel, string> = { 0: '', 1: 'text-red-600', 2: 'text-amber-600', 3: 'text-blue-600', 4: 'text-green-600' };

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

// ── Schema ────────────────────────────────────────────────────────────────────
const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(120),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[a-z]/, 'Must include at least one lowercase letter')
      .regex(/[0-9]/, 'Must include at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must include at least one special character'),
    confirmPassword: z.string(),
    agreedToTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the Terms & Privacy Policy to continue' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Component ─────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const passwordValue   = watch('password', '');
  const confirmValue    = watch('confirmPassword', '');
  const agreedToTerms   = watch('agreedToTerms');

  // Live mismatch: show only once the confirm field has content
  const confirmMismatch = confirmValue.length > 0 && passwordValue !== confirmValue && !errors.confirmPassword;

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setLoading(true);
    setError('');
    try {
      const result = await authService.googleAuth(credentialResponse.credential);
      setAuth(result.user, result.token);
      toast.success(`Welcome, ${result.user.name.split(' ')[0]}!`);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError('');
    try {
      const res = await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      // Navigate to OTP screen — pass email + dev_otp (null in production)
      navigate('/verify-email', { state: { email: data.email, dev_otp: res.dev_otp ?? null } });
    } catch (err: any) {
      setError(err.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#E2E8F0] mb-1">Create account</h2>
      <p className="text-sm text-[#9CA3AF] mb-6">Start your financial journey with FinWise AI</p>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700/30 dark:text-red-300 rounded-lg p-3 mb-4 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" type="text" {...register('name')} className="input" placeholder="Jatin Sharma" autoComplete="name" disabled={loading} />
          {errors.name && <p className="text-xs text-red-600 mt-1" role="alert">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" {...register('email')} className="input" placeholder="you@example.com" autoComplete="email" disabled={loading} />
          {errors.email && <p className="text-xs text-red-600 mt-1" role="alert">{errors.email.message}</p>}
        </div>

        {/* Password + live strength bar */}
        <div>
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
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
          <PasswordStrengthBar password={passwordValue} />
          {errors.password && <p className="text-xs text-red-600 mt-1" role="alert">{errors.password.message}</p>}
        </div>

        {/* Confirm password + live mismatch */}
        <div>
          <label htmlFor="confirmPassword" className="label">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            className={`input ${confirmMismatch ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="Repeat your password"
            autoComplete="new-password"
            disabled={loading}
          />
          {confirmMismatch && (
            <p className="text-xs text-red-600 mt-1" role="alert">Passwords do not match</p>
          )}
          {errors.confirmPassword && !confirmMismatch && (
            <p className="text-xs text-red-600 mt-1" role="alert">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Terms checkbox — submit blocked until checked */}
        <div className="flex items-start gap-3 pt-1">
          <input
            id="agreedToTerms"
            type="checkbox"
            {...register('agreedToTerms')}
            className="mt-0.5 w-4 h-4 rounded border-[#D1D5DB] accent-[#0F172A] cursor-pointer flex-shrink-0"
            disabled={loading}
          />
          <label htmlFor="agreedToTerms" className="text-sm text-[#4B5563] dark:text-[#94A3B8] leading-snug cursor-pointer select-none">
            I agree to the{' '}
            <a href="#" className="text-[#0F172A] dark:text-[#E2E8F0] underline hover:no-underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-[#0F172A] dark:text-[#E2E8F0] underline hover:no-underline">Privacy Policy</a>
          </label>
        </div>
        {errors.agreedToTerms && (
          <p className="text-xs text-red-600 -mt-2" role="alert">{errors.agreedToTerms.message}</p>
        )}

        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2"
          disabled={loading || !agreedToTerms}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Creating account…</>
          ) : 'Create account'}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
        <span className="text-sm text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
      </div>

      <div className="mt-6 flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google sign-up failed')}
          useOneTap
        />
      </div>

      <p className="text-center text-sm text-[#9CA3AF] mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-[#0F172A] dark:text-[#94A3B8] font-medium hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
