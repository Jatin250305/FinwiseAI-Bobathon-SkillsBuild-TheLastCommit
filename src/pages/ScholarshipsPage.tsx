// ── Scholarships Page ─────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, ExternalLink, CheckCircle, AlertTriangle, HelpCircle, BookOpen } from 'lucide-react';
import { scholarshipService } from '@/services/scholarshipService';
import { Modal, LoadingState, ErrorState, Alert } from '@/components/ui/index';
import { formatINR, formatDate } from '@/utils/helpers';
import type { Scholarship, EligibilityResult } from '@/types/scholarship';

const eligibilitySchema = z.object({
  course: z.string().min(2, 'Course is required'),
  year: z.coerce.number().min(1).max(6),
  cgpa: z.coerce.number().min(0).max(10),
  familyIncome: z.coerce.number().positive('Income is required'),
  location: z.string().min(2, 'Location is required'),
  category: z.string().optional(),
});
type EligibilityForm = z.infer<typeof eligibilitySchema>;

const STATUS_CONFIG = {
  likely_eligible: { icon: CheckCircle, label: 'Likely Eligible', colors: 'bg-green-50 border-green-300 text-green-800' },
  may_not_be_eligible: { icon: AlertTriangle, label: 'May Not Be Eligible', colors: 'bg-red-50 border-red-300 text-red-800' },
  more_information_required: { icon: HelpCircle, label: 'More Information Required', colors: 'bg-amber-50 border-amber-300 text-amber-800' },
};

const APP_STATUS_COLORS: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  not_applied: 'bg-gray-100 text-gray-700',
};

export default function ScholarshipsPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showChecker, setShowChecker] = useState(false);
  const [checking, setChecking] = useState(false);
  const [eligibilityResults, setEligibilityResults] = useState<EligibilityResult[] | null>(null);

  useEffect(() => {
    scholarshipService.getAll().then(setScholarships).catch(() => setError('Unable to load scholarships.')).finally(() => setLoading(false));
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<EligibilityForm>({
    resolver: zodResolver(eligibilitySchema),
    defaultValues: { year: 2, cgpa: 7.5, familyIncome: 400000, location: 'Delhi' },
  });

  const onCheck = async (data: EligibilityForm) => {
    setChecking(true);
    setEligibilityResults(null);
    try {
      const results = await scholarshipService.checkEligibility(data);
      setEligibilityResults(results);
    } finally {
      setChecking(false);
    }
  };

  const filtered = scholarships.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.provider.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingState message="Loading scholarships..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between page-header">
        <div>
          <h2 className="page-title">Scholarship Opportunities</h2>
          <p className="page-subtitle">{scholarships.length} scholarships available</p>
        </div>
        <button onClick={() => setShowChecker(true)} className="btn-primary text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Check My Eligibility
        </button>
      </div>

      <Alert variant="info">
        Scholarship information is retrieved from official sources. Eligibility results are indicative only and not official decisions. Always verify with the scholarship provider.
      </Alert>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
        <input type="search" placeholder="Search scholarships..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" aria-label="Search scholarships" />
      </div>

      {/* Scholarship cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {filtered.map((sc) => (
          <div key={sc.id} className="card hover:border-[#0F172A]/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] text-sm leading-snug">{sc.name}</h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">{sc.provider}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-base font-bold text-[#0F172A] dark:text-[#F1F5F9]">{formatINR(sc.amount)}</span>
                {sc.applicationStatus && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${APP_STATUS_COLORS[sc.applicationStatus]}`}>
                    {sc.applicationStatus.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#4B5563] dark:text-[#94A3B8] mb-3">
              <p><span className="font-medium text-[#0F172A] dark:text-[#E2E8F0]">Eligibility:</span> {sc.eligibilityDescription}</p>
              <p><span className="font-medium text-[#0F172A] dark:text-[#E2E8F0]">Academic:</span> {sc.academicRequirements}</p>
              <p><span className="font-medium text-[#0F172A] dark:text-[#E2E8F0]">Income:</span> {sc.incomeRequirements}</p>
              <p><span className="font-medium text-[#0F172A] dark:text-[#E2E8F0]">Deadline:</span> {formatDate(sc.deadline)}</p>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {sc.requiredDocuments.map((doc) => (
                <span key={doc} className="text-[10px] bg-[#897A74]/15 dark:bg-white/10 text-[#4B5563] dark:text-[#94A3B8] px-2 py-0.5 rounded-full">{doc}</span>
              ))}
            </div>

            <a href={sc.officialUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[#0F172A] dark:text-[#94A3B8] font-medium hover:underline">
              <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              View Official Source
            </a>
          </div>
        ))}
      </div>

      {/* Eligibility Checker Modal */}
      <Modal open={showChecker} onClose={() => setShowChecker(false)} title="Check My Eligibility" size="lg">
        <div className="space-y-5">
          <Alert variant="warning">
            Results are indicative and based on available criteria. They are not official eligibility decisions. Always verify with the scholarship provider.
          </Alert>

          {!eligibilityResults ? (
            <form onSubmit={handleSubmit(onCheck)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Course/Program</label>
                  <input type="text" {...register('course')} className="input" placeholder="e.g. B.Tech CSE" />
                  {errors.course && <p className="text-xs text-red-600 mt-1">{errors.course.message}</p>}
                </div>
                <div>
                  <label className="label">Year of Study</label>
                  <input type="number" min="1" max="6" {...register('year')} className="input" />
                  {errors.year && <p className="text-xs text-red-600 mt-1">{errors.year.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">CGPA (out of 10)</label>
                  <input type="number" step="0.1" min="0" max="10" {...register('cgpa')} className="input" />
                  {errors.cgpa && <p className="text-xs text-red-600 mt-1">{errors.cgpa.message}</p>}
                </div>
                <div>
                  <label className="label">Annual Family Income (₹)</label>
                  <input type="number" step="10000" {...register('familyIncome')} className="input" />
                  {errors.familyIncome && <p className="text-xs text-red-600 mt-1">{errors.familyIncome.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Location</label>
                  <input type="text" {...register('location')} className="input" placeholder="e.g. Delhi" />
                  {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location.message}</p>}
                </div>
                <div>
                  <label className="label">Category (optional)</label>
                  <select {...register('category')} className="input">
                    <option value="">Select category</option>
                    {['General','OBC','SC','ST','EWS','Minority'].map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowChecker(false)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={checking} className="btn-primary text-sm flex items-center gap-2">
                  {checking ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Checking...</> : 'Check Eligibility'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {eligibilityResults.map((res, i) => {
                const cfg = STATUS_CONFIG[res.eligibility.status];
                const Icon = cfg.icon;
                return (
                  <div key={i} className={`rounded-xl border p-4 ${cfg.colors}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden />
                      <span className="font-semibold text-sm">{cfg.label}</span>
                    </div>
                    <p className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] text-sm mb-1">{res.scholarship.name}</p>
                    <p className="text-xs text-[#4B5563] dark:text-[#94A3B8] mb-2">{res.eligibility.explanation}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {res.eligibility.matchingCriteria.map((c) => (
                        <span key={c} className="text-[10px] bg-white/60 text-[#0F172A] dark:text-[#F1F5F9] px-2 py-0.5 rounded-full border border-current/20">{c}</span>
                      ))}
                    </div>
                    {/* Source attribution */}
                    <div className="mt-3 pt-3 border-t border-current/20">
                      <p className="text-xs font-semibold mb-1">Source: {res.source.title}</p>
                      <p className="text-xs opacity-80">{res.source.publisher}</p>
                      <a href={res.source.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium mt-1 hover:underline">
                        <ExternalLink className="w-3 h-3" /> View Official Source
                      </a>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setEligibilityResults(null)} className="btn-secondary text-sm w-full">Check Again</button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
