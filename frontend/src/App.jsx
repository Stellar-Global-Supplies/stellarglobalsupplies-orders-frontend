import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import Sidebar         from './components/Sidebar';
import SSOCallback     from './components/SSOCallback';
import LoginPage       from './pages/LoginPage';
import DashboardPage   from './pages/DashboardPage';
import OrdersPage      from './pages/OrdersPage';
import NewOrderPage    from './pages/NewOrderPage';
import OrderDetailPage from './pages/OrderDetailPage';
import TrackOrderPage  from './pages/TrackOrderPage';
import './styles/globals.css';
import { supabaseConfigError } from './utils/supabase';

const LANDING_URL =
  process.env.REACT_APP_LANDING_URL || 'https://apps.stellarglobalsupplies.com';

function RequireAuth() {
  const { user, loading } = useAuth();
  const callback = window.location.href;

  useEffect(() => {
    if (loading || user) return;

    // If the existing sign-out flow is already redirecting to the
    // central landing page, do not start another redirect.
    if (window.location.href.startsWith(LANDING_URL)) {
      return;
    }

    const encodedCallback = encodeURIComponent(callback);

    window.location.replace(
      `${LANDING_URL}/login?callback=${encodedCallback}`
    );
  }, [loading, user, callback]);

  // Keep the spinner visible while authentication is being resolved
  // or while the unauthenticated redirect is taking place.
  if (loading || !user) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <span
          className="spinner spinner-dark"
          style={{ width: 36, height: 36 }}
        />
      </div>
    );
  }

  return <Outlet />;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <div className="mobile-header">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="mobile-logo">
          <div className="mobile-logo-icon">SG</div>
          <span>Stellar OMS</span>
        </div>
      </div>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

function ConfigErrorScreen({ message }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#0F172A',
        color: '#F8FAFB',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          textAlign: 'center',
          background: '#1E293B',
          borderRadius: 12,
          padding: '2.5rem 2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,.3)',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>

        <h1
          style={{
            fontSize: 22,
            margin: '0 0 12px',
            fontWeight: 700,
          }}
        >
          Configuration Error
        </h1>

        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.6,
            color: '#94A3B8',
            margin: '0 0 20px',
          }}
        >
          {message}
        </p>

        <div
          style={{
            background: '#0D1F2D',
            borderRadius: 8,
            padding: '1rem 1.25rem',
            textAlign: 'left',
            fontSize: 13,
            color: '#64748B',
            fontFamily: 'monospace',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              color: '#94A3B8',
              fontWeight: 600,
            }}
          >
            Required environment variables:
          </p>

          <p style={{ margin: '4px 0' }}>
            • REACT_APP_SUPABASE_URL
          </p>

          <p style={{ margin: '4px 0' }}>
            • REACT_APP_SUPABASE_ANON_KEY
          </p>

          <p style={{ margin: '4px 0' }}>
            • REACT_APP_API_BASE_URL
          </p>

          <p style={{ margin: '4px 0' }}>
            • REACT_APP_WHATSAPP_NUMBER
          </p>

          <p style={{ margin: '4px 0' }}>
            • REACT_APP_LANDING_URL
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  if (supabaseConfigError) {
    return <ConfigErrorScreen message={supabaseConfigError} />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* SSO entry point */}
            <Route
              path="/sso-callback"
              element={<SSOCallback />}
            />

            {/* /login redirects to portal */}
            <Route
              path="/login"
              element={<LoginPage />}
            />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route
                  path="/"
                  element={<DashboardPage />}
                />

                <Route
                  path="/orders"
                  element={<OrdersPage />}
                />

                <Route
                  path="/orders/:id"
                  element={<OrderDetailPage />}
                />

                <Route
                  path="/new-order"
                  element={<NewOrderPage />}
                />
              </Route>
            </Route>

            {/* Public tracking — no auth */}
            <Route
              path="/track/:token"
              element={<TrackOrderPage />}
            />

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '13.5px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,.12)',
            },
            success: {
              iconTheme: {
                primary: '#00B98E',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
