import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { RoleProvider, useRole, type UserRole } from './hooks/useRole';
import { ErrorBoundary } from './components/ErrorBoundary';

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Sessions = lazy(() => import('./pages/Sessions').then(m => ({ default: m.Sessions })));
const Webhooks = lazy(() => import('./pages/Webhooks').then(m => ({ default: m.Webhooks })));
const Logs = lazy(() => import('./pages/Logs').then(m => ({ default: m.Logs })));
const Composer = lazy(() => import('./pages/Composer').then(m => ({ default: m.Composer })));
const Contacts = lazy(() => import('./pages/Contacts').then(m => ({ default: m.Contacts })));
const Groups = lazy(() => import('./pages/Groups').then(m => ({ default: m.Groups })));
const Messages = lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));
const Campaigns = lazy(() => import('./pages/Campaigns').then(m => ({ default: m.Campaigns })));
const CampaignNew = lazy(() => import('./pages/CampaignNew').then(m => ({ default: m.CampaignNew })));
const CampaignDetail = lazy(() => import('./pages/CampaignDetail').then(m => ({ default: m.CampaignDetail })));
const ApiKeys = lazy(() => import('./pages/ApiKeys').then(m => ({ default: m.ApiKeys })));
const SettingsPage = lazy(() => import('./pages/Settings').then(m => ({ default: m.SettingsPage })));

const TOKEN_KEY = 'openwa_token';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function isTokenValid(token: string): boolean {
  const exp = getTokenExpiry(token);
  if (exp === null) return false;
  return exp * 1000 > Date.now();
}

function AppContent() {
  const savedToken = localStorage.getItem(TOKEN_KEY);
  const initiallyValid = savedToken ? isTokenValid(savedToken) : false;

  const [isAuthenticated, setIsAuthenticated] = useState(initiallyValid);
  const { setRole, role } = useRole();
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (logoutTimerRef.current !== null) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  const scheduleLogout = (token: string) => {
    clearTimer();
    const exp = getTokenExpiry(token);
    if (exp === null) return;
    const remainingMs = exp * 1000 - Date.now();
    if (remainingMs <= 0) {
      performLogout();
      return;
    }
    logoutTimerRef.current = setTimeout(() => performLogout(), remainingMs);
  };

  const performLogout = () => {
    clearTimer();
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthenticated(false);
    setRole(null);
    queryClient.clear();
  };

  const handleLogin = (token: string, userRole: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    setRole(userRole as UserRole);
    setIsAuthenticated(true);
    scheduleLogout(token);
  };

  // On mount: set timer for existing valid token, verify with server
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token || !isTokenValid(token)) {
      if (token) localStorage.removeItem(TOKEN_KEY);
      setIsAuthenticated(false);
      return;
    }

    scheduleLogout(token);

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) { performLogout(); return null; }
        return res.json();
      })
      .then((data: { role?: string } | null) => {
        if (data?.role) setRole(data.role as UserRole);
      })
      .catch(() => { /* keep existing state on network error */ });

    return () => clearTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-tab sync: logout or re-login in another tab propagates here
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY) return;

      if (!e.newValue) {
        // Another tab logged out
        clearTimer();
        setIsAuthenticated(false);
        setRole(null);
        queryClient.clear();
      } else if (isTokenValid(e.newValue)) {
        // Another tab logged in with a new token — adopt it and reset timer
        setIsAuthenticated(true);
        scheduleLogout(e.newValue);
        const exp = getTokenExpiry(e.newValue);
        if (exp !== null) {
          fetch('/api/auth/me', { headers: { Authorization: `Bearer ${e.newValue}` } })
            .then(res => res.ok ? res.json() : null)
            .then((data: { role?: string } | null) => {
              if (data?.role) setRole(data.role as UserRole);
            })
            .catch(() => {});
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadingFallback = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Loader2 className="animate-spin" size={32} />
    </div>
  );

  if (!isAuthenticated) {
    return <Suspense fallback={loadingFallback}><Login onLogin={handleLogin} /></Suspense>;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={loadingFallback}>
          <Routes>
            <Route path="/" element={<Layout onLogout={performLogout} userRole={role} />}>
              <Route index element={<Dashboard />} />
              <Route path="sessions" element={<Sessions />} />
              <Route path="webhooks" element={<Webhooks />} />
              <Route path="logs" element={<Logs />} />
              <Route path="composer" element={<Composer />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="groups" element={<Groups />} />
              <Route path="messages" element={<Messages />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="campaigns/new" element={<CampaignNew />} />
              <Route path="campaigns/:id" element={<CampaignDetail />} />
              <Route path="campaigns/:id/edit" element={<CampaignNew />} />
              <Route path="api-keys" element={<ApiKeys />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RoleProvider>
          <AppContent />
        </RoleProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
