import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { SgsLogo } from '../pages/LoginPage';
import toast from 'react-hot-toast';

const NAV = [
  {
    to: '/', label: 'Dashboard', end: true,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>,
  },
  {
    to: '/orders', label: 'Orders', end: false,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
    </svg>,
  },
  {
    to: '/new-order', label: 'New Order', end: false,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
    </svg>,
  },
];

export default function Sidebar({ open, onClose }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/login');
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'SG';

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.55)',
            zIndex: 99,
            backdropFilter: 'blur(3px)',
            display: 'block',
          }}
        />
      )}

      <aside style={{
        width: 240,
        background: 'linear-gradient(180deg, #0A1929 0%, #0D2337 100%)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 100,
        borderRight: '1px solid rgba(255,255,255,.06)',
        transform: open ? 'translateX(0)' : undefined,
        transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
      }}
      className={`sidebar${open ? ' open' : ''}`}
      >
        {/* ── Logo ── */}
        <div style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid rgba(255,255,255,.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SgsLogo size={38} />
            <div>
              <div style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 800, fontSize: 13.5,
                color: '#fff', lineHeight: 1.25, letterSpacing: '.1px',
              }}>Stellar Global</div>
              <div style={{ fontSize: 10.5, color: '#00B98E', fontWeight: 600, letterSpacing: .8, textTransform: 'uppercase', marginTop: 1 }}>
                Supplies OMS
              </div>
            </div>
          </div>

          {/* Version badge */}
          <div style={{
            marginTop: 14,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,185,142,.12)',
            border: '1px solid rgba(0,185,142,.25)',
            borderRadius: 20, padding: '3px 10px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00B98E', display: 'inline-block', boxShadow: '0 0 6px #00B98E' }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#00B98E', letterSpacing: .5 }}>v2.0 Live</span>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
            textTransform: 'uppercase', color: 'rgba(255,255,255,.25)',
            padding: '8px 8px 6px',
          }}>Navigation</span>

          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                color: isActive ? '#00B98E' : 'rgba(255,255,255,.55)',
                textDecoration: 'none', fontSize: 13.5, fontWeight: 600,
                transition: 'all .15s',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(0,185,142,.15) 0%, rgba(0,185,142,.06) 100%)'
                  : 'transparent',
                boxShadow: isActive ? 'inset 3px 0 0 #00B98E' : 'none',
                borderRadius: isActive ? '0 8px 8px 0' : 8,
                marginLeft: isActive ? -12 : 0,
                paddingLeft: isActive ? 24 : 12,
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '12px 0' }} />

          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
            textTransform: 'uppercase', color: 'rgba(255,255,255,.25)',
            padding: '0 8px 6px',
          }}>Quick Stats</span>

          <div style={{
            margin: '4px 0',
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 10, padding: '14px 14px',
          }}>
            {[
              { label: 'Active Orders', val: '—', color: '#60A5FA' },
              { label: 'Pending Payment', val: '—', color: '#FBBF24' },
              { label: 'Delivered Today', val: '—', color: '#34D399' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>—</span>
              </div>
            ))}
            <a
              href="/orders"
              style={{ fontSize: 11, color: '#00B98E', textDecoration: 'none', fontWeight: 600, letterSpacing: .3 }}
            >View all orders →</a>
          </div>
        </nav>

        {/* ── Footer ── */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8,
              color: 'rgba(255,255,255,.45)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', border: 'none', background: 'transparent',
              width: '100%', textAlign: 'left', transition: 'all .15s', marginBottom: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {theme === 'light'
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
            }
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>

          {/* User card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #00B98E, #009B76)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,185,142,.4)',
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
              <div style={{ fontSize: 10, color: '#00B98E', fontWeight: 700, marginTop: 1 }}>Staff · Active</div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,.3)', padding: 4, borderRadius: 6,
                transition: 'color .15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.3)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
