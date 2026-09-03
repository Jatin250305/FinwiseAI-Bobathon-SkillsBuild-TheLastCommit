// ── Login Page ────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '@/layouts/AuthLayout';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const MAX_ATTEMPTS = 5;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const isLockedOut = failedAttempts >= MAX_ATTEMPTS;

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setAuthError('');
    try {
      const result = await authService.login(data);
      if ('needs_verification' in result) {
        // Account exists but email not verified — redirect to OTP screen
        // Pass dev_otp so the amber banner + pre-fill work in development
        navigate('/verify-email', { state: { email: result.email, dev_otp: result.dev_otp ?? null } });
        return;
      }
      if ('requires_2fa' in result) {
        navigate('/login/2fa', { state: { partial_token: result.partial_token, email: data.email } });
        return;
      }
      setFailedAttempts(0);
      setAuth(result.user, result.token);
      toast.success(`Welcome back, ${result.user.name.split(' ')[0]}!`);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setFailedAttempts((n) => n + 1);
      setAuthError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-[#0F172A] dark:text-[#E2E8F0] mb-1">Welcome back</h2>
      <p className="text-sm text-[#9CA3AF] mb-6">Sign in to your FinWise account</p>

      {/* Generic error — never reveals which field was wrong */}
      {authError && !isLockedOut && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 text-red-700 dark:text-red-300 rounded-xl p-3 mb-4 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
          <span>{authError}</span>
        </div>
      )}

      {/* Client-side cooldown after MAX_ATTEMPTS failures */}
      {isLockedOut && (
        <div role="alert" className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-300 rounded-xl p-3 mb-4 flex items-start gap-2 text-sm">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
          <span>
            Too many failed attempts. Please wait a moment or{' '}
            <Link to="/forgot-password" className="underline font-medium">reset your password</Link>.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="input"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading || isLockedOut}
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1" role="alert">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className="input pr-10"
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading || isLockedOut}
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
          {errors.password && (
            <p className="text-xs text-red-600 mt-1" role="alert">{errors.password.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-[#0F172A] dark:text-[#94A3B8] hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="btn-primary w-full flex items-center justify-center gap-2 mt-1"
          disabled={loading || isLockedOut}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Signing in…</>
          ) : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-[#9CA3AF] mt-6">
        Don't have an account?{' '}
        <Link to="/register" className="text-[#0F172A] dark:text-[#94A3B8] font-semibold hover:underline">
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}
