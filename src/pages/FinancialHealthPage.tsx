// ── Financial Health Page ─────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { financialHealthService } from '@/services/financialHealthService';
import { FinancialCard } from '@/components/ui/FinancialCard';
import { LoadingState, ErrorState } from '@/components/ui/index';
import { useChartColors } from '@/utils/helpers';
import type { FinancialHealth } from '@/types/financialHealth';

function ScoreRing({ score, isDark }: { score: number; isDark: boolean }) {
  const pct = score / 100;
  const r = 52;
  const circ = 2 * Math.PI * r;
  // Light: dark navy for good, amber/red for warn/bad
  // Dark: use visible high-contrast tones — slate-200 for good, amber-400/red-400 for warn/bad
  const color = isDark
    ? (score >= 75 ? '#CBD5E1' : score >= 50 ? '#fbbf24' : '#f87171')
    : (score >= 75 ? '#0F172A' : score >= 50 ? '#f59e0b' : '#ef4444');
  const label = score >= 75 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Work';
  const trackStroke = isDark ? 'rgba(148,163,184,0.15)' : '#E4E4E7';
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140"
          aria-label={`Financial health score: ${score} out of 100`} role="img"
          className="text-[#0F172A] dark:text-[#F1F5F9]">
          {/* Track */}
          <circle cx="70" cy="70" r={r} fill="none" stroke={trackStroke} strokeWidth="10" />
          {/* Progress */}
          <circle
            cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
          {/* Score — inherits currentColor from svg element for dark mode */}
          <text x="70" y="64" textAnchor="middle" fontSize="26" fontWeight="700" fill="currentColor">{score}</text>
          <text x="70" y="80" textAnchor="middle" fontSize="10" fill={isDark ? '#64748B' : '#9CA3AF'}>out of 100</text>
        </svg>
      </div>
      <p className="text-sm font-semibold mt-2" style={{ color }}>{label}</p>
    </div>
  );
}

export default function FinancialHealthPage() {
  const c = useChartColors();
  const isDarkMode = c.primary !== '#0F172A'; // true when dark
  const [health, setHealth] = useState<FinancialHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    financialHealthService.get().then(setHealth).catch(() => setError('Unable to load financial health.')).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading financial health..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!health) return null;

  const metricsArray = Object.values(health.metrics);
  const radarData = metricsArray.map((m) => ({ metric: m.label.replace(' ', '\n'), score: m.score }));

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <h2 className="page-title">Financial Health</h2>
        <p className="page-subtitle">Powered by your verified financial data — not independently calculated by AI</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Score ring */}
        <FinancialCard title="Overall Score">
          <ScoreRing score={health.overallScore} isDark={isDarkMode} />
          <div className="flex items-center justify-center gap-2 mt-1">
            {health.scoreChange >= 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-[#0F172A] dark:text-[#94A3B8]" aria-hidden />
                <span className="text-sm text-[#0F172A] dark:text-[#E2E8F0] font-medium">+{health.scoreChange} points this month</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-red-500" aria-hidden />
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">{health.scoreChange} points this month</span>
              </>
            )}
          </div>
        </FinancialCard>

        {/* Radar chart */}
        <FinancialCard title="Metric Breakdown" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={c.polarGrid} />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: c.polarTick }} />
              <Radar dataKey="score" fill={c.primary} fillOpacity={isDarkMode ? 0.15 : 0.2} stroke={c.primary} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </FinancialCard>
      </div>

      {/* Metric details */}
      <FinancialCard title="Detailed Metrics">
        <div className="grid sm:grid-cols-2 gap-5">
          {metricsArray.map((metric) => {
            // Light: navy/amber/red; Dark: slate-300/amber-400/red-400 fills for visibility
            const colorClass = isDarkMode
              ? (metric.score >= 75 ? 'progress-fill-dm-normal' : metric.score >= 50 ? 'bg-amber-400' : 'bg-red-400')
              : (metric.score >= 75 ? 'bg-[#0F172A]' : metric.score >= 50 ? 'bg-amber-400' : 'bg-red-500');
            const labelColor = metric.score >= 75 ? 'text-[#0F172A] dark:text-[#94A3B8]' : metric.score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
            return (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#0F172A] dark:text-[#E2E8F0]">{metric.label}</span>
                  <span className={`text-sm font-bold ${labelColor}`}>{metric.score}/100</span>
                </div>
                <div className="h-2 bg-[#F3F4F6] dark:bg-white/8 rounded-full overflow-hidden"
                  role="progressbar" aria-valuenow={metric.score} aria-valuemin={0} aria-valuemax={100}
                  aria-label={`${metric.label}: ${metric.score}/100`}>
                  <div className={`h-full rounded-full progress-fill ${colorClass}`} style={{ width: `${metric.score}%` }} />
                </div>
                <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] leading-relaxed">{metric.description}</p>
              </div>
            );
          })}
        </div>
      </FinancialCard>

      {/* AI Explanation */}
      <div className="rounded-[16px] border border-[#0F172A]/20 dark:border-[#0F172A]/25 p-5
        bg-gradient-to-br from-[#0F172A]/5 to-zinc-50 dark:from-[#0F172A]/10 dark:to-[#0F172A]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#0F172A]/15 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#0F172A] dark:text-[#94A3B8]" aria-hidden />
          </div>
          <span className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Why Did My Score Change?</span>
          <span className="text-xs text-[#9CA3AF] dark:text-[#94A3B8]">— AI Explanation</span>
        </div>
        <p className="text-sm text-[#4B5563] dark:text-[#94A3B8] leading-relaxed">{health.aiExplanation}</p>
        <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mt-3 leading-relaxed border-t border-[#0F172A]/10 pt-3">
          The financial health score is calculated by the FinWise backend using verified metrics. This explanation is generated by the AI to help you understand the result — it does not modify or override the score.
        </p>
      </div>
    </div>
  );
}
