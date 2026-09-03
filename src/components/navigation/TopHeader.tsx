// ── Top Header ─────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { Menu, Bell, Search, Sun, Moon } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { notificationService } from '@/services/notificationService';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/transactions':     'Transactions',
  '/analytics':        'Analytics',
  '/budget':           'Budget',
  '/loan':             'Education Loan',
  '/loan/usage':       'Loan Usage',
  '/affordability':    'Affordability Checker',
  '/scholarships':     'Scholarships',
  '/income':           'Income & Expenses',
  '/savings-goals':    'Savings Goals',
  '/financial-health': 'Financial Health',
  '/ai-bot':           'AI Assistant',
  '/reports':          'Reports',
  '/notifications':    'Notifications',
  '/settings':         'Settings',
};

export default function TopHeader() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const title = PAGE_TITLES[location.pathname] ?? 'FinWise AI';

  // Poll unread count every 30 s while authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const fetch = async () => {
      try {
        const { count } = await notificationService.getUnreadCount();
        if (!cancelled) setUnreadCount(count);
      } catch { /* silent — non-critical */ }
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isAuthenticated]);

  return (
    <header className="
      h-[56px] flex items-center px-4 gap-3 flex-shrink-0
      bg-white/95 dark:bg-[#0F172A]/95
      backdrop-blur-md
      border-b border-[#E5E7EB] dark:border-white/[0.06]
      shadow-[0_1px_0_rgba(15,23,42,0.04)]
    ">
      {/* Mobile menu toggle */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-1.5 rounded-lg
          hover:bg-[#F3F4F6] dark:hover:bg-white/8
          text-[#6B7280] dark:text-[#94A3B8] transition-colors"
        aria-label="Toggle navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h1 className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] flex-1 truncate">
        {title}
      </h1>

      {/* Search — desktop only */}
      <div
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl w-52 cursor-pointer
          bg-[#F3F4F6] dark:bg-white/[0.06]
          border border-[#E5E7EB] dark:border-white/[0.08]
          text-[#9CA3AF] dark:text-[#475569] text-sm
          hover:border-[#CBD5E1] dark:hover:border-white/15
          hover:bg-[#F9FAFB] dark:hover:bg-white/[0.09]
          transition-all duration-200"
        role="button"
        tabIndex={0}
        aria-label="Search"
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
        <span className="text-xs truncate">Search anything...</span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="hidden md:flex p-1.5 rounded-lg
          hover:bg-[#F3F4F6] dark:hover:bg-white/8
          text-[#6B7280] dark:text-[#94A3B8] transition-colors"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark'
          ? <Sun className="w-4 h-4" aria-hidden />
          : <Moon className="w-4 h-4" aria-hidden />
        }
      </button>

      {/* Notifications — real unread count badge */}
      <Link
        to="/notifications"
        className="relative p-1.5 rounded-lg
          hover:bg-[#F3F4F6] dark:hover:bg-white/8
          text-[#6B7280] dark:text-[#94A3B8] transition-colors"
        aria-label={unreadCount > 0 ? `Notifications — ${unreadCount} unread` : 'Notifications'}
        onClick={() => setUnreadCount(0)}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          unreadCount <= 9 ? (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full
                bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A]
                text-[9px] font-bold flex items-center justify-center leading-none"
              style={{ boxShadow: '0 0 0 1.5px white' }}
            >
              {unreadCount}
            </span>
          ) : (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full
                bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A]
                text-[9px] font-bold flex items-center justify-center leading-none"
              style={{ boxShadow: '0 0 0 1.5px white' }}
            >
              9+
            </span>
          )
        )}
      </Link>

      {/* User avatar */}
      {user && (
        <Link
          to="/settings"
          className="w-7 h-7 rounded-full flex items-center justify-center
            text-xs font-bold text-white flex-shrink-0
            hover:opacity-85 hover:scale-105 transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #0F172A, #334155)',
            boxShadow: '0 2px 6px rgba(15,23,42,0.25)',
          }}
          aria-label="Profile settings"
        >
          {user.name.charAt(0).toUpperCase()}
        </Link>
      )}
    </header>
  );
}
