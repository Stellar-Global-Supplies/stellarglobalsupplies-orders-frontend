import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

/* Animated particle field for the left panel */
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 55;
    const nodes = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,185,142,0.45)';
        ctx.fill();
      });
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(0,185,142,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

const STATS = [
  { value: '2,400+', label: 'Orders Processed' },
  { value: '99.8%',  label: 'On-Time Delivery' },
  { value: '₹12Cr+', label: 'Revenue Managed'  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [focused,     setFocused]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'Inter', system-ui, sans-serif",
      background: '#0D1F2D',
    }}>
      {/* ── LEFT PANEL ── */}
      <div style={{
        flex: '0 0 52%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #0A1929 0%, #0D2337 40%, #0A2E20 100%)',
      }}>
        <ParticleCanvas />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(rgba(0,185,142,.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,185,142,.04) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <SgsLogo size={44} />
            <div>
              <div style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 800, fontSize: 17,
                color: '#fff', lineHeight: 1.2, letterSpacing: '.2px',
              }}>Stellar Global Supplies</div>
              <div style={{ fontSize: 11, color: '#00B98E', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>
                Order Management System
              </div>
            </div>
          </div>
        </div>

        {/* Hero copy */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,185,142,.12)', border: '1px solid rgba(0,185,142,.3)',
            borderRadius: 20, padding: '5px 14px',
            marginBottom: 24,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00B98E', display: 'inline-block' }} />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#00B98E', letterSpacing: .5 }}>OMS v2.0 — Now Live</span>
          </div>

          <h1 style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 42, fontWeight: 800, lineHeight: 1.15,
            color: '#fff', margin: '0 0 18px',
            letterSpacing: '-.5px',
          }}>
            Every order.<br />
            <span style={{
              background: 'linear-gradient(90deg, #00B98E, #00D4A4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Perfectly tracked.</span>
          </h1>

          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.5)', lineHeight: 1.8, margin: '0 0 40px', maxWidth: 380 }}>
            India's most reliable industrial supply partner — powered by a system built for speed, clarity, and zero errors.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32 }}>
            {STATS.map(s => (
              <div key={s.label}>
                <div style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 22, fontWeight: 800, color: '#fff',
                }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.35)', marginTop: 3, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tag */}
        <div style={{ position: 'relative', zIndex: 2, fontSize: 12, color: 'rgba(255,255,255,.2)' }}>
          © {new Date().getFullYear()} Stellar Global Supplies · stellarglobalsupplies.com
        </div>
      </div>

       {/* ── RIGHT PANEL ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F7FB',
        padding: '24px 16px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 420,
          animation: 'loginSlide .4s ease',
        }}>
          <style>{`
            @keyframes loginSlide {
              from { opacity: 0; transform: translateY(16px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .login-input {
              width: 100%; padding: 13px 44px 13px 14px;
              border-radius: 10px; font-size: 14.5px;
              font-family: inherit; outline: none;
              transition: border .15s, box-shadow .15s;
              background: #fff;
            }
            .login-input:focus {
              border-color: #00B98E !important;
              box-shadow: 0 0 0 3px rgba(0,185,142,.15) !important;
            }
            .login-btn {
              width: 100%; padding: 14px;
              background: linear-gradient(135deg, #00B98E 0%, #009B76 100%);
              color: #fff; border: none; border-radius: 10px;
              font-size: 15px; font-weight: 700; cursor: pointer;
              transition: all .15s; font-family: inherit;
              box-shadow: 0 4px 20px rgba(0,185,142,.35);
              display: flex; align-items: center; justify-content: center; gap: 8px;
            }
            .login-btn:hover:not(:disabled) {
              transform: translateY(-1px);
              box-shadow: 0 8px 28px rgba(0,185,142,.45);
            }
            .login-btn:active:not(:disabled) { transform: translateY(0); }
            .login-btn:disabled { opacity: .7; cursor: not-allowed; }
          `}</style>

          <div style={{ marginBottom: 36 }}>
            <h2 style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: 28, fontWeight: 800,
              color: '#0D1F2D', margin: '0 0 8px',
            }}>Sign in to OMS</h2>
            <p style={{ fontSize: 14, color: '#94A3B4', margin: 0 }}>
              Authorised Stellar Global staff only
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4A5568', letterSpacing: .4, textTransform: 'uppercase', marginBottom: 7 }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'email' ? '#00B98E' : '#CBD5E1', transition: 'color .15s' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <input
                  type="email"
                  className="login-input"
                  style={{ paddingLeft: 42, border: `1.5px solid ${focused === 'email' ? '#00B98E' : '#DDE4EB'}` }}
                  placeholder="you@stellarglobalsupplies.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  required autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4A5568', letterSpacing: .4, textTransform: 'uppercase', marginBottom: 7 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'pw' ? '#00B98E' : '#CBD5E1', transition: 'color .15s' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="login-input"
                  style={{ paddingLeft: 42, border: `1.5px solid ${focused === 'pw' ? '#00B98E' : '#DDE4EB'}` }}
                  placeholder="••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('pw')}
                  onBlur={() => setFocused(null)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B4', padding: 4,
                  }}
                >
                  {showPw
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: 4 }}>
              {loading
                ? <><Spinner /> Signing in…</>
                : <>Sign in to OMS <ArrowRight /></>
              }
            </button>
          </form>

          {/* Trust row */}
          <div style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid #EEF2F5',
            display: 'flex', alignItems: 'center', gap: 10,
            justifyContent: 'center',
          }}>
            {['256-bit SSL', 'Supabase Auth', 'AWS Hosted'].map((t, i) => (
              <span key={t} style={{
                fontSize: 11.5, fontWeight: 600, color: '#94A3B4',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {i > 0 && <span style={{ color: '#DDE4EB' }}>·</span>}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#00B98E" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile layout override */}
      <style>{`
        @media (max-width: 768px) {
          .login-split-left { display: none !important; }
          .login-split-right { background: #0D1F2D !important; }
          .login-split-right > div { background: #fff; border-radius: 20px; padding: 32px 24px !important; }
        }
      `}</style>
    </div>
  );
}

function Spinner() {
  return <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .6s linear infinite' }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </span>;
}
function ArrowRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
}

/* Inline SVG logo matching Stellar brand — teal hex on navy */
export function SgsLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#00B98E"/>
      {/* S */}
      <path d="M11 17.5C11 15 13 13 16.5 13C20 13 21.5 15 21.5 17C21.5 19 20 20 17 21C14 22 11 23.5 11 26.5C11 29.5 13.5 31.5 17.5 31.5C21.5 31.5 23 29 23 27" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      {/* G */}
      <path d="M37 18C35.5 15.5 33 14 30 14C25.5 14 22 17.5 22 22C22 26.5 25.5 30 30 30C33.5 30 36 28 37 25.5V22.5H31" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
