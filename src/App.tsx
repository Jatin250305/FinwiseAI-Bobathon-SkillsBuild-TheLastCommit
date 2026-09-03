// ── App Router ────────────────────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Layouts
import AppLayout from '@/layouts/AppLayout';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import TwoFactorPage from '@/pages/auth/TwoFactorPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';

// App pages
import DashboardPage from '@/pages/DashboardPage';
import TransactionsPage from '@/pages/TransactionsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import BudgetPage from '@/pages/BudgetPage';
import LoanPage from '@/pages/LoanPage';
import LoanUsagePage from '@/pages/LoanUsagePage';
import LoanApplicationPage from '@/pages/LoanApplicationPage';
import MyLoanApplicationsPage from '@/pages/MyLoanApplicationsPage';
import BankDashboardPage from '@/pages/BankDashboardPage';
import BankReviewPage from '@/pages/BankReviewPage';
import AffordabilityPage from '@/pages/AffordabilityPage';
import ScholarshipsPage from '@/pages/ScholarshipsPage';
import IncomePage from '@/pages/IncomePage';
import SavingsGoalsPage from '@/pages/SavingsGoalsPage';
import FinancialHealthPage from '@/pages/FinancialHealthPage';
import AIBotPage from '@/pages/AIBotPage';
import SettingsPage from '@/pages/SettingsPage';
import ReportsPage from '@/pages/ReportsPage';
import NotificationsPage from '@/pages/NotificationsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/2fa" element={<TwoFactorPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Protected app routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/loan" element={<LoanPage />} />
            <Route path="/loan/usage" element={<LoanUsagePage />} />
            <Route path="/loans/apply" element={<LoanApplicationPage />} />
            <Route path="/loans/my-applications" element={<MyLoanApplicationsPage />} />
            <Route path="/bank/dashboard" element={<BankDashboardPage />} />
            <Route path="/bank/applications/:applicationId" element={<BankReviewPage />} />
            <Route path="/affordability" element={<AffordabilityPage />} />
            <Route path="/scholarships" element={<ScholarshipsPage />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/savings-goals" element={<SavingsGoalsPage />} />
            <Route path="/financial-health" element={<FinancialHealthPage />} />
            <Route path="/ai-bot" element={<AIBotPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif',
            fontSize: '13px',
            background: '#0F172A',
            color: '#E2E8F0',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          },
          success: { iconTheme: { primary: '#0F172A', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
