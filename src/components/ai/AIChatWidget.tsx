// ── Floating AI Chat Widget ───────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Database, Calculator, BookOpen, Minimize2 } from 'lucide-react';
import { aiService } from '@/services/aiService';
import { cn } from '@/utils/helpers';
import type { ChatMessage } from '@/types/ai';
import { useLocation } from 'react-router-dom';

const QUICK_PROMPTS = [
  'Can I afford a ₹5,000 purchase?',
  'Why did my expenses increase?',
  'Explain my loan EMI',
  'How can I save more?',
];

const DATA_TYPE_CONFIG = {
  financial_data:        { icon: Database,    label: 'Verified Data',  bg: 'bg-[#F9FAFB] dark:bg-white/5 border-[#E5E7EB] dark:border-white/10 text-[#0F172A] dark:text-[#94A3B8]' },
  calculation:           { icon: Calculator,  label: 'Calculated',     bg: 'bg-[#0F172A]/8 dark:bg-[#1E293B] border-[#0F172A]/20 dark:border-white/15 text-[#0F172A] dark:text-[#94A3B8]' },
  retrieved_information: { icon: BookOpen,    label: 'Retrieved',      bg: 'bg-[#F9FAFB] dark:bg-white/5 border-[#E5E7EB] dark:border-white/10 text-[#52525B] dark:text-[#94A3B8]' },
  insight:               { icon: Sparkles,    label: 'AI Insight',     bg: 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-400' },
};

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your FinWise financial copilot. Ask me anything about your finances.",
  timestamp: new Date().toISOString(),
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0,1,2].map(i => (
        <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-[#0F172A]"
          style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // All hooks must be called before any conditional return
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Don't show on the full AI bot page (after all hooks)
  if (location.pathname === '/ai-bot') return null;

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: `u${Date.now()}`, role: 'user', content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await aiService.chat({ message: text.trim(), context: { page: location.pathname } });
      const aMsg: ChatMessage = {
        id: `a${Date.now()}`, role: 'assistant', content: res.message,
        timestamp: new Date().toISOString(),
        data: res.data, sources: res.sources, disclaimer: res.disclaimer,
      };
      setMessages(prev => [...prev, aMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `err${Date.now()}`, role: 'assistant',
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      {/* ── Expanded chat panel ──────────────────────────────────── */}
      {open && (
        <div className={cn(
          'fixed bottom-20 right-5 z-40 w-80 sm:w-96 flex flex-col',
          'bg-white dark:bg-[#0F172A] rounded-2xl shadow-modal',
          'border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)]',
          'slide-in-right',
        )} style={{ maxHeight: 'min(500px, calc(100vh - 120px))' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] dark:border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#0F172A' }}>
                <Bot className="w-3.5 h-3.5 text-white" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0F172A] dark:text-[#E2E8F0]">FinWise AI</p>
                <p className="text-[10px] text-[#9CA3AF] dark:text-[#94A3B8]">Financial copilot</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-white/10 transition-colors"
                aria-label="Minimize">
                <Minimize2 className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#94A3B8]" />
              </button>
              <button onClick={() => { setOpen(false); setMessages([WELCOME]); }}
                className="p-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-white/10 transition-colors"
                aria-label="Close">
                <X className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#94A3B8]" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#0F172A' }}>
                    <Bot className="w-3 h-3 text-white" aria-hidden />
                  </div>
                )}
                <div className={cn('max-w-[85%] space-y-1.5', msg.role === 'user' ? 'items-end flex flex-col' : '')}>
                  <div className={cn(
                    'px-3 py-2 rounded-xl text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'text-white rounded-tr-sm'
                      : 'bg-[#F9FAFB] dark:bg-white/8 text-[#0F172A] dark:text-[#F1F5F9] rounded-tl-sm',
                  )} style={msg.role === 'user' ? { backgroundColor: '#0F172A' } : {}}>
                    {msg.content}
                  </div>
                  {/* Data blocks */}
                  {msg.data?.map((block, i) => {
                    const cfg = DATA_TYPE_CONFIG[block.type];
                    const Ico = cfg.icon;
                    return (
                      <div key={i} className={cn('rounded-xl border p-2.5 text-[10px] w-full', cfg.bg)}>
                        <div className="flex items-center gap-1 mb-1.5">
                          <Ico className="w-3 h-3" aria-hidden />
                          <span className="font-bold uppercase tracking-wide">{cfg.label}</span>
                        </div>
                        <p className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] mb-1">{block.title}</p>
                        {block.values && Object.entries(block.values).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-3">
                            <span className="text-[#4B5563] dark:text-[#94A3B8]">{k}</span>
                            <span className="font-semibold">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {msg.disclaimer && (
                    <p className="text-[9px] text-[#9CA3AF] dark:text-[#94A3B8] italic leading-relaxed">
                      {msg.disclaimer}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#0F172A' }}>
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-[#F9FAFB] dark:bg-white/8 rounded-xl rounded-tl-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts — only shown when no user messages yet */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex-shrink-0">
              <div className="flex flex-wrap gap-1">
                {QUICK_PROMPTS.map(p => (
                  <button key={p} onClick={() => send(p)}
                    className="text-[10px] px-2 py-1 rounded-full border border-[#E5E7EB] dark:border-white/10
                      bg-[#F9FAFB] dark:bg-white/5 text-[#4B5563] dark:text-[#94A3B8]
                      hover:border-[#94A3B8] dark:hover:border-white/30 hover:text-[#0F172A] dark:hover:text-white transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-[#E5E7EB] dark:border-white/10 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask about your finances..."
              className="input flex-1 text-xs py-2 px-3"
              disabled={loading}
              aria-label="Message FinWise AI"
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#0F172A' }}
              aria-label="Send"
            >
              <Send className="w-3.5 h-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* ── FAB button ───────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full shadow-modal',
          'flex items-center justify-center transition-all duration-200',
          'hover:scale-105 active:scale-95',
        )}
        style={{ backgroundColor: '#0F172A' }}
        aria-label={open ? 'Close FinWise AI assistant' : 'Open FinWise AI assistant'}
        aria-expanded={open}
      >
        {open
          ? <X className="w-5 h-5 text-white" aria-hidden />
          : <Bot className="w-5 h-5 text-white" aria-hidden />
        }
        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: '#0F172A' }} aria-hidden />
        )}
      </button>
    </>
  );
}
