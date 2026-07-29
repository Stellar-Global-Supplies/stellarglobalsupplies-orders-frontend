import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import Sidebar from './components/Sidebar';
import LoginPage      from './pages/LoginPage';
import DashboardPage  from './pages/DashboardPage';
import OrdersPage     from './pages/OrdersPage';
import NewOrderPage   from './pages/NewOrderPage';
import OrderDetailPage from './pages/OrderDetailPage';
import TrackOrderPage from './pages/TrackOrderPage';
import './styles/globals.css';
import { setUser, clearUser, recordNavigation } from './tracing';
import { supabaseConfigError } from './utils/supabase';

// Records page navigations as OTLP spans so NR shows which pages users visit
function RouteTracker() {
  const location = useLocation();
  const prevRef  = useRef('');
  useEffect(() => {
    recordNavigation(location.pathname, prevRef.current);
    prevRef.current = location.pathname;
  }, [location.pathname]);
  return null;
}

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span className="spinner spinner-dark" style={{ width: 36, height: 36 }} />
      </div>
    );
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Mobile header with hamburger */}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="mobile-logo">
          <div className="mobile-logo-icon">SG</div>
          <span>Stellar OMS</span>
        </div>
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

// Shows a friendly config error screen instead of a white-screen crash
// when required environment variables are missing.
function ConfigErrorScreen({ message }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#0F172A',
      color: '#F8FAFB',
    }}>
      <div style={{
        maxWidth: 520,
        textAlign: 'center',
        background: '#1E293B',
        borderRadius: 12,
        padding: '2.5rem 2rem',
        boxShadow: '0 8px 32px rgba(0,0,0,.3)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
        <h1 style={{ fontSize: 22, margin: '0 0 12px', fontWeight: 700 }}>
          Configuration Error
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#94A3B8', margin: '0 0 20px' }}>
          {message}
        </p>
        <div style={{
          background: '#0D1F2D',
          borderRadius: 8,
          padding: '1rem 1.25rem',
          textAlign: 'left',
          fontSize: 13,
          color: '#64748B',
          fontFamily: 'monospace',
        }}>
          <p style={{ margin: '0 0 8px', color: '#94A3B8', fontWeight: 600 }}>Required environment variables:</p>
          <p style={{ margin: '4px 0' }}>• REACT_APP_SUPABASE_URL</p>
          <p style={{ margin: '4px 0' }}>• REACT_APP_SUPABASE_ANON_KEY</p>
          <p style={{ margin: '4px 0' }}>• REACT_APP_API_BASE_URL</p>
          <p style={{ margin: '4px 0' }}>• REACT_APP_WHATSAPP_NUMBER</p>
        </div>
        <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 20, marginBottom: 0 }}>
          Add these in your Cloudflare Pages dashboard under <strong>Settings → Environment variables</strong>,
          then trigger a new deployment.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  // If required env vars are missing, show a config error screen
  // instead of crashing with a white screen.
  if (supabaseConfigError) {
    return <ConfigErrorScreen message={supabaseConfigError} />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <RouteTracker />
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/"            element={<DashboardPage />} />
                <Route path="/orders"      element={<OrdersPage />} />
                <Route path="/orders/:id"  element={<OrderDetailPage />} />
                <Route path="/new-order"   element={<NewOrderPage />} />
              </Route>
            </Route>

            {/* Public order tracking - no auth required */}
            <Route path="/track/:token" element={<TrackOrderPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
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
            success: { iconTheme: { primary: '#00B98E', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
