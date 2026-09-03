// ── Utility helpers ───────────────────────────────────────────────────────────
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useEffect, useState } from 'react';

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Indian Rupees */
export function formatINR(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format ISO date string to readable form */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

/** Capitalize first letter */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

/** Calculate percentage */
export function pct(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Return the current month as YYYY-MM (e.g. "2025-07") */
export function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Return the current month as a human-readable label (e.g. "July 2025") */
export function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** Get greeting based on time of day */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Dark-mode-aware Recharts color palette ────────────────────────────────────
// Returns chart colors that react to theme changes.
// Light-mode colors are UNCHANGED from the approved baseline.
// Dark-mode colors are high-contrast but restrained (no neon).

export interface ChartColors {
  /** Primary line / first bar — dark: bright slate-white */
  primary: string;
  /** Secondary line / second bar — dark: muted slate */
  secondary: string;
  /** Tertiary (savings / dashed line) — dark: mid slate */
  tertiary: string;
  /** CartesianGrid lines */
  grid: string;
  /** Axis tick fill */
  tick: string;
  /** Polar grid (radar) */
  polarGrid: string;
  /** Polar angle axis ticks */
  polarTick: string;
  /** Tooltip background */
  tooltipBg: string;
  /** Tooltip border */
  tooltipBorder: string;
  /** Bar chart cursor fill on hover */
  cursor: string;
  /** Pie / donut segment palette */
  pie: string[];
  /** Category breakdown bar fills (ranked list) */
  catBars: string[];
}

const LIGHT_COLORS: ChartColors = {
  primary:       '#0F172A',
  secondary:     '#1E293B',
  tertiary:      '#475569',
  grid:          '#E4E4E7',
  tick:          '#9CA3AF',
  polarGrid:     '#E4E4E7',
  polarTick:     '#4B5563',
  tooltipBg:     '#FFFFFF',
  tooltipBorder: '#E5E7EB',
  cursor:        'rgba(15,23,42,0.04)',
  pie:           ['#0F172A','#1E293B','#334155','#475569','#64748B','#94A3B8','#CBD5E1','#E2E8F0'],
  catBars:       ['#0F172A','#1E293B','#334155','#475569','#64748B','#94A3B8','#CBD5E1','#E2E8F0'],
};

// Dark mode: separate from dark background (#0A1628 / #1E293B cards).
// Use light-on-dark: bright slates, slate-200, slate-300.
const DARK_COLORS: ChartColors = {
  primary:       '#E2E8F0',   // slate-200 — clear white-ish line / first bar
  secondary:     '#64748B',   // slate-500 — second bar, clearly distinct from bg
  tertiary:      '#94A3B8',   // slate-400 — tertiary line (savings)
  grid:          'rgba(148,163,184,0.12)',  // very subtle slate grid
  tick:          '#64748B',   // readable muted ticks
  polarGrid:     'rgba(148,163,184,0.18)',
  polarTick:     '#94A3B8',
  tooltipBg:     '#1E293B',
  tooltipBorder: 'rgba(255,255,255,0.08)',
  cursor:        'rgba(226,232,240,0.06)',
  // Pie: varied but restrained — avoid adjacent segments merging
  pie:           ['#E2E8F0','#64748B','#94A3B8','#475569','#CBD5E1','#334155','#B0B8C1','#38495A'],
  catBars:       ['#E2E8F0','#94A3B8','#64748B','#475569','#CBD5E1','#334155','#B0B8C1','#38495A'],
};

function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * React hook that returns Recharts-compatible color values
 * that automatically switch between light and dark mode.
 * Light-mode values are identical to the approved baseline.
 */
export function useChartColors(): ChartColors {
  const [dark, setDark] = useState(isDark);

  useEffect(() => {
    // Watch for class changes on <html> (Tailwind dark mode toggle)
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark ? DARK_COLORS : LIGHT_COLORS;
}
