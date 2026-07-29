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

export default function App() {
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