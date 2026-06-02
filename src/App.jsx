import { Toaster, ToastProvider } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/ThemeContext';
import { LangProvider } from '@/lib/LangContext';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import PlausibleLoader from '@/lib/PlausibleLoader';
import PWAInstaller from '@/lib/PWAInstaller';
import { SentryErrorBoundary } from '@/lib/sentry';
import { lazy, Suspense } from 'react';

// Eager — Marketing-Site, sofort sichtbar
import Landing from '@/pages/Landing';
import StaticPage from '@/pages/StaticPage';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MobileGreeterLayout from '@/components/layout/MobileGreeterLayout';

// Lazy — Portale werden nur bei Bedarf geladen
const OperationsCenterDashboard = lazy(() => import('@/pages/admin/OperationsCenterDashboard'));
const AdminMissions = lazy(() => import('@/pages/admin/AdminMissions'));
const AdminMissionDetail = lazy(() => import('@/pages/admin/AdminMissionDetail'));
const AdminCandidates = lazy(() => import('@/pages/admin/AdminCandidates'));
const AdminGreeters = lazy(() => import('@/pages/admin/AdminGreeters'));
const AdminExecution = lazy(() => import('@/pages/admin/AdminExecution'));
const AdminTeam = lazy(() => import('@/pages/admin/AdminTeam'));
const AdminCompanies = lazy(() => import('@/pages/admin/AdminCompanies'));
const AdminInvoices = lazy(() => import('@/pages/admin/AdminInvoices'));
const AdminMessages = lazy(() => import('@/pages/admin/AdminMessages'));
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminActivityLog = lazy(() => import('@/pages/admin/AdminActivityLog'));
const AdminSOPs = lazy(() => import('@/pages/admin/AdminSOPs'));
const AdminTemplates = lazy(() => import('@/pages/admin/AdminTemplates'));
const AdminQuality = lazy(() => import('@/pages/admin/AdminQuality'));
const CompanyDashboard = lazy(() => import('@/pages/company/CompanyDashboard'));
const CompanyMissionDetail = lazy(() => import('@/pages/company/CompanyMissionDetail'));
const CompanyDocuments = lazy(() => import('@/pages/company/CompanyDocuments'));
const CompanySLA = lazy(() => import('@/pages/company/CompanySLA'));
const GreeterDashboard = lazy(() => import('@/pages/greeter/GreeterDashboard'));
const GreeterMissions = lazy(() => import('@/pages/greeter/GreeterMissions'));
const GreeterMissionDetail = lazy(() => import('@/pages/greeter/GreeterMissionDetail'));
const GreeterProfile = lazy(() => import('@/pages/greeter/GreeterProfile'));
const GreeterAvailability = lazy(() => import('@/pages/greeter/GreeterAvailability'));
const GreeterSOP = lazy(() => import('@/pages/greeter/GreeterSOP'));
const TalentDashboard = lazy(() => import('@/pages/talent/TalentDashboard'));
const TalentDocuments = lazy(() => import('@/pages/talent/TalentDocuments'));
const TalentGreeter = lazy(() => import('@/pages/talent/TalentGreeter'));

const PortalFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings } = useAuth();
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PortalFallback />;
  }
  return (
    <Suspense fallback={<PortalFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/impressum" element={<StaticPage />} />
        <Route path="/datenschutz" element={<StaticPage />} />
        <Route path="/agb" element={<StaticPage />} />
        <Route path="/karriere" element={<StaticPage />} />
        <Route path="/presse" element={<StaticPage />} />

        <Route element={<DashboardLayout role="admin" />}>
          <Route path="/admin" element={<OperationsCenterDashboard />} />
          <Route path="/admin/missions" element={<AdminMissions />} />
          <Route path="/admin/missions/:id" element={<AdminMissionDetail />} />
          <Route path="/admin/execution" element={<AdminExecution />} />
          <Route path="/admin/candidates" element={<AdminCandidates />} />
          <Route path="/admin/greeters" element={<AdminGreeters />} />
          <Route path="/admin/companies" element={<AdminCompanies />} />
          <Route path="/admin/invoices" element={<AdminInvoices />} />
          <Route path="/admin/messages" element={<AdminMessages />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/logs" element={<AdminActivityLog />} />
          <Route path="/admin/sops" element={<AdminSOPs />} />
          <Route path="/admin/templates" element={<AdminTemplates />} />
          <Route path="/admin/quality" element={<AdminQuality />} />
          <Route path="/admin/team" element={<AdminTeam />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>

        <Route element={<DashboardLayout role="company" />}>
          <Route path="/company" element={<CompanyDashboard />} />
          <Route path="/company/missions/:id" element={<CompanyMissionDetail />} />
          <Route path="/company/documents" element={<CompanyDocuments />} />
          <Route path="/company/sla" element={<CompanySLA />} />
          <Route path="/company/invoices" element={<AdminInvoices />} />
          <Route path="/company/messages" element={<AdminMessages />} />
          <Route path="/company/settings" element={<AdminSettings />} />
        </Route>

        <Route element={<MobileGreeterLayout />}>
          <Route path="/greeter-dashboard" element={<GreeterDashboard />} />
          <Route path="/greeter-dashboard/missions" element={<GreeterMissions />} />
          <Route path="/greeter-dashboard/missions/:id" element={<GreeterMissionDetail />} />
          <Route path="/greeter-dashboard/profile" element={<GreeterProfile />} />
          <Route path="/greeter-dashboard/availability" element={<GreeterAvailability />} />
          <Route path="/greeter-dashboard/sop" element={<GreeterSOP />} />
          <Route path="/greeter-dashboard/messages" element={<AdminMessages />} />
          <Route path="/greeter-dashboard/settings" element={<AdminSettings />} />
        </Route>

        <Route element={<DashboardLayout role="talent" />}>
          <Route path="/talent" element={<TalentDashboard />} />
          <Route path="/talent/documents" element={<TalentDocuments />} />
          {/* Journey merged into the dashboard — keep the path as an alias */}
          <Route path="/talent/journey" element={<Navigate to="/talent" replace />} />
          <Route path="/talent/greeter" element={<TalentGreeter />} />
          <Route path="/talent/messages" element={<AdminMessages />} />
          <Route path="/talent/settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default function App() {
  return (
    <ThemeProvider>
    <LangProvider>
    <SentryErrorBoundary
      fallback={({ resetError }) => (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--ds-bg)' }}>
          <div className="max-w-md text-center">
            <h1 className="font-serif text-3xl font-bold" style={{ color: 'var(--ds-t1)' }}>Etwas ist schiefgelaufen.</h1>
            <p className="mt-3 text-sm" style={{ color: 'var(--ds-t2)' }}>
              Der Fehler wurde an unser Team gemeldet. Bitte versuche es erneut.
            </p>
            <button onClick={resetError} className="btn-primary mt-6">
              Neu laden
            </button>
          </div>
        </div>
      )}
    >
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <ToastProvider>
            <Router>
              <PlausibleLoader />
              <PWAInstaller />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </ToastProvider>
        </QueryClientProvider>
      </AuthProvider>
    </SentryErrorBoundary>
    </LangProvider>
    </ThemeProvider>
  );
}
