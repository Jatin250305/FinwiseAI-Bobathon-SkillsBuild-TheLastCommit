// ── Premium Design System Components ─────────────────────────────────────────
import React from 'react';
import { cn } from '@/utils/helpers';

// ── GlassCard ─────────────────────────────────────────────────────────────────
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  dark?: boolean;
}

export function GlassCard({ children, className, hover, dark }: GlassCardProps) {
  return (
    <div className={cn(
      'rounded-[16px] border p-5 transition-all duration-200',
      dark
        ? 'bg-[#1E293B]/95 border-white/10 backdrop-blur-md shadow-glass-navy text-white'
        : 'border-white/30 backdrop-blur-md shadow-glass',
      !dark && 'bg-white/75',
      hover && 'hover:-translate-y-0.5 hover:shadow-card-hover cursor-pointer',
      className,
    )}>
      {children}
    </div>
  );
}

// ── PageBackground ────────────────────────────────────────────────────────────
type PageVariant =
  | 'dashboard' | 'transactions' | 'budget' | 'goals' | 'savings'
  | 'analytics' | 'reports' | 'ai' | 'profile' | 'notifications'
  | 'settings' | 'auth' | 'health' | 'loan' | 'default';

const VARIANT_GRADIENTS: Record<PageVariant, { light: string; dark: string }> = {
  dashboard:     { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  transactions:  { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  budget:        { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  goals:         { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  savings:       { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  analytics:     { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  reports:       { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  ai:            { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  profile:       { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  notifications: { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  settings:      { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  auth:          { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  health:        { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  loan:          { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] via-[#0A1628] to-[#0A1628]' },
  default:       { light: 'from-[#FAFAFA] to-[#FAFAFA]', dark: 'from-[#0A1628] to-[#0A1628]' },
};

interface PageBackgroundProps {
  variant?: PageVariant;
  className?: string;
  children?: React.ReactNode;
}

export function PageBackground({ variant = 'default', className, children }: PageBackgroundProps) {
  const g = VARIANT_GRADIENTS[variant] ?? VARIANT_GRADIENTS.default;
  return (
    <div className={cn(
      'relative min-h-screen overflow-hidden',
      `bg-gradient-to-br ${g.light}`,
      `dark:bg-gradient-to-br dark:${g.dark}`,
      className,
    )}>
      {children}
    </div>
  );
}

// ── GradientOrb ───────────────────────────────────────────────────────────────
interface GradientOrbProps {
  size?: number;
  color?: 'teal' | 'accent' | 'soft' | 'olive';
  className?: string;
  pulse?: boolean;
}

const ORB_COLORS = {
  teal:   'radial-gradient(circle, rgba(15,23,42,0.12) 0%, transparent 70%)',
  accent: 'radial-gradient(circle, rgba(71,85,105,0.12) 0%, transparent 70%)',
  soft:   'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
  olive:  'radial-gradient(circle, rgba(148,163,184,0.08) 0%, transparent 70%)',
};

export function GradientOrb({ size = 400, color = 'teal', className, pulse }: GradientOrbProps) {
  return (
    <div
      className={cn('absolute rounded-full pointer-events-none select-none', pulse && 'orb-pulse', className)}
      style={{
        width: size,
        height: size,
        background: ORB_COLORS[color],
      }}
      aria-hidden
    />
  );
}

// ── SectionVisual — decorative SVG wave/graph motif ───────────────────────────
export function FinancialWave({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 60"
      fill="none"
      preserveAspectRatio="none"
      className={cn('opacity-10 pointer-events-none select-none', className)}
      aria-hidden
    >
      <polyline
        points="0,45 30,30 60,40 90,15 120,28 150,10 180,22 210,8 240,18 270,5 300,12"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <polyline
        points="0,55 30,42 60,52 90,30 120,40 150,25 180,36 210,20 240,30 270,18 300,22"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        strokeOpacity="0.5"
      />
    </svg>
  );
}

// ── AnimatedProgress ──────────────────────────────────────────────────────────
interface AnimatedProgressProps {
  value: number;
  color?: string;
  height?: number;
  label?: string;
  className?: string;
}

export function AnimatedProgress({ value, color = '#0F172A', height = 6, label, className }: AnimatedProgressProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Progress: ${pct}%`}
      className={cn('w-full bg-[#F3F4F6] dark:bg-white/10 rounded-full overflow-hidden', className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full progress-fill"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── PremiumButton ─────────────────────────────────────────────────────────────
interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'teal';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function PremiumButton({
  children, variant = 'primary', size = 'md', loading, icon, className, disabled, ...props
}: PremiumButtonProps) {
  const sizeClass = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-sm' }[size];
  const variantClass = {
    primary:   'bg-[#0F172A] text-white hover:bg-[#253347] hover:shadow-glow-navy',
    secondary: 'bg-white text-[#0F172A] border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#CBD5E1] dark:bg-[#1E293B] dark:text-[#F1F5F9] dark:border-[rgba(255,255,255,0.08)] dark:hover:bg-[#253347]',
    ghost:     'text-[#6B7280] hover:bg-[#F3F4F6] dark:text-[#94A3B8] dark:hover:bg-[#253347]',
    teal:      'bg-[#0F172A] text-white hover:bg-[#1E293B] hover:shadow-card',
  }[variant];

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-[10px]',
        'transition-all duration-200 active:scale-[0.98]',
        'focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClass, variantClass, className,
      )}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" aria-label="Loading" />
      ) : icon}
      {children}
    </button>
  );
}
