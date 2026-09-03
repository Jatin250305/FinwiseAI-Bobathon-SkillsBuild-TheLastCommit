// ── Reports Page ─────────────────────────────────────────────────────────────
import { FileText, Download, Calendar, BarChart3, BookOpen, Zap } from 'lucide-react';
import { FinancialCard } from '@/components/ui/FinancialCard';
import { EmptyState } from '@/components/ui/index';
import { formatDate } from '@/utils/helpers';

const REPORT_TYPES = [
  { label: 'Monthly Summary', desc: 'Income, expenses and savings for a month', icon: BarChart3, color: 'text-[#0F172A] dark:text-[#94A3B8]', bg: 'bg-[#0F172A]/8 dark:bg-white/8' },
  { label: 'Semester Report', desc: 'Complete financial overview for a semester', icon: BookOpen, color: 'text-[#4B5563] dark:text-[#E2E8F0]', bg: 'bg-[#F3F4F6] dark:bg-white/8' },
  { label: 'Annual Report', desc: 'Full year financial analysis', icon: BarChart3, color: 'text-[#475569] dark:text-[#94A3B8]', bg: 'bg-[#475569]/8 dark:bg-[#475569]/15' },
  { label: 'On-Demand Report', desc: 'Generate a custom date range report', icon: Zap, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/15' },
];

export default function ReportsPage() {
  const today = formatDate(new Date().toISOString());

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      <div className="page-header">
        <h2 className="page-title">Reports</h2>
        <p className="page-subtitle">Generate and download your financial reports</p>
      </div>

      {/* Report types */}
      <FinancialCard title="Generate a Report">
        <div className="grid sm:grid-cols-2 gap-3">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            return (
              <button
                key={rt.label}
                className="flex items-center gap-4 p-4 rounded-xl border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)]
                    text-left hover:border-[#0F172A]/50 hover:-translate-y-0.5 hover:shadow-card-hover
                    dark:hover:border-[#0F172A]/40 transition-all duration-200 group bg-white dark:bg-[#0F172A]"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${rt.bg} transition-transform duration-200 group-hover:scale-105`}>
                  <Icon className={`w-4.5 h-4.5 ${rt.color}`} size={18} aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] group-hover:text-[#0F172A] transition-colors">
                    {rt.label}
                  </p>
                  <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8] mt-0.5 leading-tight">{rt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </FinancialCard>

      {/* Previous reports */}
      <FinancialCard title="Previous Reports">
        <EmptyState
          icon={<FileText className="w-7 h-7" />}
          title="Build your financial history to unlock reports"
          description="Generate your first financial report to see it here. Reports can be downloaded as PDF."
          action={
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF] dark:text-[#94A3B8] mt-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Last checked: {today}</span>
            </div>
          }
        />
      </FinancialCard>

      {/* Automated reports CTA */}
      <div className="relative rounded-[16px] overflow-hidden p-5 border border-[#0F172A]/30 dark:border-white/8"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(232,201,207,0.15) 0%, transparent 70%)' }} />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white mb-1">Automated Reports</p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(200,220,220,0.7)' }}>
              Set up automatic monthly and semester reports. Reports will be generated and saved here.
              Download and share them at any time.
            </p>
          </div>
          <Download className="w-5 h-5 flex-shrink-0 text-[#E2E8F0] mt-0.5" aria-hidden />
        </div>
        <button
          className="mt-4 px-4 py-2 rounded-[10px] text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)', boxShadow: '0 4px 10px rgba(15,23,42,0.20)' }}
        >
          Set up automated reports
        </button>
      </div>
    </div>
  );
}
