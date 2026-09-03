// ── Sidebar Navigation ─────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, BarChart3, Wallet, GraduationCap,
  Calculator, Award, PiggyBank, HeartPulse, Bot, Settings, LogOut,
  X, TrendingUp, ChevronLeft, ChevronRight, Sun, Moon, FileText,
  ClipboardList, Building2,
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { authService } from '@/services/authService';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: string;
  roles?: string[];   // if set, only show for these roles
}

const STUDENT_SECTIONS: { heading?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-[17px] h-[17px]" /> },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { to: '/transactions',     label: 'Transactions',      icon: <ArrowLeftRight className="w-[17px] h-[17px]" /> },
      { to: '/budget',           label: 'Budget',            icon: <Wallet className="w-[17px] h-[17px]" /> },
      { to: '/income',           label: 'Income & Expenses', icon: <TrendingUp className="w-[17px] h-[17px]" /> },
      { to: '/analytics',        label: 'Analytics',         icon: <BarChart3 className="w-[17px] h-[17px]" /> },
    ],
  },
  {
    heading: 'Planning',
    items: [
      { to: '/loan',             label: 'Education Loan',    icon: <GraduationCap className="w-[17px] h-[17px]" /> },
      { to: '/loans/apply',      label: 'Apply for Loan',    icon: <ClipboardList className="w-[17px] h-[17px]" /> },
      { to: '/loans/my-applications', label: 'My Applications', icon: <FileText className="w-[17px] h-[17px]" /> },
      { to: '/scholarships',     label: 'Scholarships',      icon: <Award className="w-[17px] h-[17px]" /> },
      { to: '/savings-goals',    label: 'Savings Goals',     icon: <PiggyBank className="w-[17px] h-[17px]" /> },
      { to: '/affordability',    label: 'Affordability',     icon: <Calculator className="w-[17px] h-[17px]" /> },
      { to: '/financial-health', label: 'Financial Health',  icon: <HeartPulse className="w-[17px] h-[17px]" /> },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { to: '/reports',          label: 'Reports',           icon: <FileText className="w-[17px] h-[17px]" /> },
      { to: '/ai-bot',           label: 'AI Assistant',      icon: <Bot className="w-[17px] h-[17px]" /> },
    ],
  },
];

const BANK_SECTIONS: { heading?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/bank/dashboard', label: 'Bank Dashboard', icon: <Building2 className="w-[17px] h-[17px]" /> },
    ],
  },
  {
    heading: 'Loan Management',
    items: [
      { to: '/bank/dashboard', label: 'All Applications', icon: <ClipboardList className="w-[17px] h-[17px]" /> },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { to: '/notifications',    label: 'Notifications',     icon: <BarChart3 className="w-[17px] h-[17px]" /> },
      { to: '/settings',         label: 'Settings',          icon: <Settings className="w-[17px] h-[17px]" /> },
    ],
  },
];

interface SidebarProps { mobile?: boolean }

export default function Sidebar({ mobile }: SidebarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isBank = user?.role === 'bank_officer' || user?.role === 'bank_admin';
  const NAV_SECTIONS = isBank ? BANK_SECTIONS : STUDENT_SECTIONS;
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const handleLogout = async () => {
    await authService.logout();
    clearAuth();
    navigate('/login', { replace: true });
  };

  const collapsed = !mobile && sidebarCollapsed;

  return (
    <nav
      className={cn(
        'h-full flex flex-col',
        // Light mode: clean white with subtle border
        'bg-white border-r border-[#E5E7EB]',
        // Dark mode: deep navy
        'dark:bg-[#0F172A] dark:border-white/[0.06]',
        // Subtle inner right highlight in dark
        'dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)]',
      )}
      aria-label="Main navigation"
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center border-b border-[#F1F5F9] dark:border-white/[0.06]',
        collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4 justify-between',
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo mark */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                boxShadow: '0 2px 8px rgba(15,23,42,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-[15px] tracking-tight text-[#0F172A] dark:text-white truncate block">
                FinWise <span className="text-[#4B5563] dark:text-[#94A3B8] font-medium">AI</span>
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              boxShadow: '0 2px 8px rgba(15,23,42,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
        )}
        {mobile ? (
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-white/8
              text-[#6B7280] dark:text-[#94A3B8] transition-colors ml-auto"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          !collapsed && (
            <button
              onClick={toggleSidebarCollapsed}
              className="p-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-white/8
                text-[#9CA3AF] dark:text-[#475569] transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && !mobile && (
        <button
          onClick={toggleSidebarCollapsed}
          className="mx-auto mt-2 p-1.5 rounded-lg
            hover:bg-[#F3F4F6] dark:hover:bg-white/8
            text-[#9CA3AF] dark:text-[#475569] transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* ── Nav items ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.heading && !collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.10em]
                text-[#9CA3AF] dark:text-[#334155]">
                {section.heading}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => mobile && setSidebarOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 rounded-xl text-sm font-medium',
                      'transition-all duration-150 relative',
                      collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                      isActive
                        ? [
                            // Light mode active: very subtle navy tint
                            'bg-[#0F172A]/[0.07] text-[#0F172A]',
                            // Dark mode active: translucent lighter navy
                            'dark:bg-[#1E293B] dark:text-white',
                            // Left indicator bar via box-shadow
                            'shadow-[inset_3px_0_0_#0F172A] dark:shadow-[inset_3px_0_0_rgba(255,255,255,0.3)]',
                          ].join(' ')
                        : [
                            'text-[#6B7280] dark:text-[#94A3B8]',
                            'hover:bg-[#F9FAFB] hover:text-[#0F172A]',
                            'dark:hover:bg-white/[0.05] dark:hover:text-[#E2E8F0]',
                          ].join(' '),
                    )}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full
                        bg-[#0F172A] text-white dark:bg-white/15 dark:text-white">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Bottom section ────────────────────────────────────────── */}
      <div className={cn(
        'border-t border-[#F1F5F9] dark:border-white/[0.06] py-3 px-2 space-y-0.5',
      )}>
        {/* Settings */}
        <NavLink
          to="/settings"
          onClick={() => mobile && setSidebarOpen(false)}
          title={collapsed ? 'Settings' : undefined}
          className={({ isActive }) => cn(
            'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 w-full',
            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
            isActive
              ? 'bg-[#0F172A]/[0.07] text-[#0F172A] dark:bg-[#1E293B] dark:text-white shadow-[inset_3px_0_0_#0F172A] dark:shadow-[inset_3px_0_0_rgba(255,255,255,0.3)]'
              : 'text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#F9FAFB] hover:text-[#0F172A] dark:hover:bg-white/5 dark:hover:text-[#E2E8F0]',
          )}
        >
          <Settings className="w-[17px] h-[17px] flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={collapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 w-full',
            'text-[#6B7280] dark:text-[#94A3B8]',
            'hover:bg-[#F9FAFB] hover:text-[#0F172A]',
            'dark:hover:bg-white/5 dark:hover:text-[#E2E8F0]',
            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
          )}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun className="w-[17px] h-[17px] flex-shrink-0" aria-hidden />
            : <Moon className="w-[17px] h-[17px] flex-shrink-0" aria-hidden />
          }
          {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 w-full',
            'text-[#6B7280] dark:text-[#94A3B8]',
            'hover:bg-red-50 hover:text-red-600',
            'dark:hover:bg-red-950/30 dark:hover:text-red-400',
            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
          )}
        >
          <LogOut className="w-[17px] h-[17px] flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>

        {/* User profile */}
        {!collapsed && user && (
          <div className="mt-2 pt-3 border-t border-[#F1F5F9] dark:border-white/[0.06]
            flex items-center gap-3 px-3 pb-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center
                text-xs font-bold flex-shrink-0 text-white"
              style={{
                background: 'linear-gradient(135deg, #0F172A, #334155)',
                boxShadow: '0 2px 6px rgba(15,23,42,0.25)',
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-[#0F172A] dark:text-white">
                {user.name}
              </p>
              <p className="text-[10px] truncate text-[#9CA3AF] dark:text-[#475569]">
                {user.email}
              </p>
            </div>
          </div>
        )}
        {collapsed && user && (
          <div className="mt-2 pt-3 border-t border-[#F1F5F9] dark:border-white/[0.06]
            flex justify-center pb-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center
                text-xs font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #0F172A, #334155)',
                boxShadow: '0 2px 6px rgba(15,23,42,0.25)',
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
