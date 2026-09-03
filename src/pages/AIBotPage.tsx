// ── AI Financial Bot Page ─────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Database, Calculator, BookOpen, RefreshCw, ExternalLink } from 'lucide-react';
import { aiService } from '@/services/aiService';
import { incomeService } from '@/services/incomeService';
import { formatINR } from '@/utils/helpers';
import type { ChatMessage } from '@/types/ai';
import type { DashboardSummary } from '@/types/income';
import { cn } from '@/utils/helpers';

const QUICK_ACTIONS = [
  { label: '📊 Analyze My Spending',     message: 'Why did my expenses increase this month?' },
  { label: '🤔 Can I Afford Something?', message: 'Can I afford a ₹8,000 purchase?' },
  { label: '🎓 Explain My Loan',         message: 'Explain my EMI and total interest on my education loan.' },
  { label: '🏦 Where Did My Loan Go?',   message: 'Where did my education loan go?' },
  { label: '🏆 Find Scholarships',       message: 'Are there scholarships I may be eligible for?' },
  { label: '❤️ My Financial Health',    message: 'Why did my financial health score change?' },
  { label: '💰 How Much Can I Save?',    message: 'How much can I realistically save this month?' },
  { label: '📋 Explain My Budget',       message: 'Explain my budget status this month.' },
];

const DATA_TYPE_CONFIG = {
  financial_data: {
    icon: Database,
    label: 'Verified Financial Data',
    light: 'bg-[#F9FAFB] border-[#E5E7EB] text-[#0F172A]',
    dark:  'dark:bg-white/5 dark:border-white/10 dark:text-[#94A3B8]',
  },
  calculation: {
    icon: Calculator,
    label: 'Backend-Calculated Result',
    light: 'bg-[#0F172A]/8 border-[#0F172A]/20 text-[#0F172A] dark:text-[#94A3B8]',
    dark:  'dark:bg-[#0F172A]/15 dark:border-[#0F172A]/25 dark:text-[#D4916A]',
  },
  retrieved_information: {
    icon: BookOpen,
    label: 'Retrieved Information',
    light: 'bg-[#F9FAFB] border-[#E5E7EB] text-[#52525B]',
    dark:  'dark:bg-white/8 dark:border-white/12 dark:text-[#94A3B8]',
  },
  insight: {
    icon: Sparkles,
    label: 'AI Insight',
    light: 'bg-amber-50 border-amber-200 text-amber-700',
    dark:  'dark:bg-amber-900/15 dark:border-amber-700/30 dark:text-amber-400',
  },
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot w-2 h-2 bg-[#0F172A] rounded-full"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-[#0F172A]' : 'bg-[#0F172A] dark:bg-[#253347]',
      )}>
        {isUser
          ? <User className="w-4 h-4 text-white" aria-hidden />
          : <Bot className="w-4 h-4 text-[#E2E8F0]" aria-hidden />
        }
      </div>

      <div className={cn('flex flex-col gap-2 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {/* Main message bubble */}
        <div className={cn(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line',
          isUser
            ? 'bg-[#0F172A] text-white rounded-tr-sm'
            : 'bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] text-[#0F172A] dark:text-[#F1F5F9] rounded-tl-sm shadow-sm',
        )}>
          {msg.content}
        </div>

        {/* Data blocks */}
        {msg.data && msg.data.length > 0 && (
          <div className="w-full space-y-2">
            {msg.data.map((block, i) => {
              const cfg = DATA_TYPE_CONFIG[block.type];
              const Icon = cfg.icon;
              return (
                <div key={i} className={cn('rounded-xl border p-3 text-xs', cfg.light, cfg.dark)}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className="w-3.5 h-3.5" aria-hidden />
                    <span className="font-semibold uppercase tracking-wide text-[10px]">{cfg.label}</span>
                  </div>
                  <p className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] mb-2">{block.title}</p>
                  {block.values && (
                    <div className="space-y-1">
                      {Object.entries(block.values).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4">
                          <span className="text-[#4B5563] dark:text-[#94A3B8]">{k}</span>
                          <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="w-full space-y-1.5">
            {msg.sources.map((src, i) => (
              <div key={i} className="flex items-start gap-2 bg-[#F9FAFB] dark:bg-white/5 border border-[#E5E7EB] dark:border-white/10 rounded-xl p-2.5 text-xs">
                <BookOpen className="w-3.5 h-3.5 text-[#52525B] dark:text-[#94A3B8] flex-shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">Retrieved Source: {src.title}</p>
                  {src.publisher && <p className="text-[#4B5563] dark:text-[#94A3B8] mt-0.5">{src.publisher}</p>}
                  <a href={src.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[#0F172A] dark:text-[#94A3B8] hover:underline mt-1 font-medium">
                    <ExternalLink className="w-3 h-3" aria-hidden />
                    View Official Source
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        {msg.disclaimer && (
          <p className="text-[10px] text-[#9CA3AF] dark:text-[#94A3B8] italic max-w-[90%] leading-relaxed">
            {msg.disclaimer}
          </p>
        )}

        <p className="text-[10px] text-[#9CA3AF] dark:text-[#94A3B8]">
          {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function FinancialSnapshot({ summary }: { summary: DashboardSummary | null }) {
  if (!summary) return (
    <div className="p-4 bg-[#0F172A] dark:bg-[#0F172A] rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-4 h-4 text-[#E2E8F0]" aria-hidden />
        <span className="text-xs font-semibold text-[#E2E8F0] uppercase tracking-wide">Financial Snapshot</span>
      </div>
      <div className="space-y-2">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-4 bg-white/10 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-[#0F172A] dark:bg-[#0F172A] rounded-xl space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-4 h-4 text-[#E2E8F0]" aria-hidden />
        <span className="text-xs font-semibold text-[#E2E8F0] uppercase tracking-wide">Your Financial Snapshot</span>
      </div>
      {[
        { label: 'Monthly Income',    value: formatINR(summary.monthlyIncome) },
        { label: 'Monthly Expenses',  value: formatINR(summary.totalExpenses) },
        { label: 'Savings',           value: formatINR(summary.currentSavings) },
        { label: 'Active Loans',      value: `${summary.activeLoans}` },
        { label: 'Financial Health',  value: `${summary.financialHealthScore}/100` },
      ].map((item) => (
        <div key={item.label} className="flex justify-between items-center text-sm border-b border-white/10 py-2 last:border-0 last:pb-0 first:pt-0">
          <span className="text-white/60 text-xs">{item.label}</span>
          <span className="font-semibold text-white text-sm">{item.value}</span>
        </div>
      ))}
      <p className="text-[10px] text-white/30 mt-2 pt-1">
        Verified data — from your FinWise account
      </p>
    </div>
  );
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Hello! I'm your FinWise Financial Copilot. I can help you understand your finances using verified data from your account.\n\nAsk me about your spending, loan, budget, savings goals, scholarship eligibility, affordability of a purchase, or your financial health.\n\nAll responses are grounded in your actual financial data — I don't fabricate numbers or independently calculate financial figures.`,
  timestamp: new Date().toISOString(),
};

export default function AIBotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    incomeService.getDashboardSummary().then(setSummary).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: `u${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiService.chat({ message: text.trim() });
      const assistantMsg: ChatMessage = {
        id: `a${Date.now()}`,
        role: 'assistant',
        content: res.message,
        timestamp: new Date().toISOString(),
        data: res.data,
        sources: res.sources,
        disclaimer: res.disclaimer,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errMsg: ChatMessage = {
        id: `err${Date.now()}`,
        role: 'assistant',
        content: "Sorry, I couldn't process that request right now. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-5 overflow-hidden fade-in">
      {/* ── Main chat panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0F172A] rounded-[16px] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] shadow-card overflow-hidden">

        {/* Chat header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#0F172A] dark:bg-[#253347] rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#E2E8F0]" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#E2E8F0]">FinWise Financial Copilot</h2>
              <p className="text-xs text-[#9CA3AF] dark:text-[#94A3B8]">AI-powered financial decision assistant</p>
            </div>
          </div>
          <button
            onClick={() => setMessages([WELCOME_MESSAGE])}
            className="btn-ghost text-xs flex items-center gap-1.5"
            aria-label="Start new conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden /> New chat
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F9FAFB] dark:bg-[#0A1628]">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0F172A] dark:bg-[#253347] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-[#E2E8F0]" aria-hidden />
              </div>
              <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] rounded-2xl rounded-tl-sm shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick actions scrollbar */}
        <div className="px-4 py-2.5 border-t border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0F172A] overflow-x-auto flex-shrink-0">
          <div className="flex gap-2 pb-0.5">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.label}
                onClick={() => sendMessage(qa.message)}
                disabled={loading}
                className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full
                  border border-[#E5E7EB] dark:border-white/10
                  bg-[#F9FAFB] dark:bg-white/5
                  text-[#4B5563] dark:text-[#94A3B8]
                  hover:border-[#94A3B8] dark:hover:border-white/30 hover:text-[#0F172A] dark:hover:text-white hover:bg-[#0F172A]/5 dark:hover:bg-white/8
                  transition-colors disabled:opacity-40"
              >
                {qa.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0F172A] flex gap-3 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances..."
            className="input flex-1"
            disabled={loading}
            aria-label="Message FinWise Copilot"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="btn-primary flex items-center justify-center w-10 h-10 p-0 flex-shrink-0"
            aria-label="Send message"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-label="Sending..." />
              : <Send className="w-4 h-4" aria-hidden />
            }
          </button>
        </div>
      </div>

      {/* ── Right context panel ─────────────────────────────── */}
      <aside className="hidden xl:flex flex-col w-72 flex-shrink-0 space-y-4">
        <FinancialSnapshot summary={summary} />

        <div className="card p-4">
          <p className="text-xs font-semibold text-[#4B5563] dark:text-[#94A3B8] uppercase tracking-wide mb-3">What I Can Help With</p>
          <ul className="space-y-2 text-xs text-[#4B5563] dark:text-[#94A3B8]">
            {[
              '💰 Spending analysis & patterns',
              '📊 Budget status & recommendations',
              '🏦 Education loan details & usage',
              '🏆 Scholarship eligibility',
              '🤔 Affordability checks',
              '❤️ Financial health score',
              '💼 Savings goal tracking',
              '📈 Income & expense trends',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 leading-snug">{item}</li>
            ))}
          </ul>
        </div>

        <div className="card p-4 border-amber-200 dark:border-amber-700/30 bg-amber-50 dark:bg-amber-900/10">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden /> Important Note
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
            All financial values are sourced from your verified FinWise account. The AI explains backend calculations — it never independently computes authoritative financial figures.
          </p>
        </div>
      </aside>
    </div>
  );
}
