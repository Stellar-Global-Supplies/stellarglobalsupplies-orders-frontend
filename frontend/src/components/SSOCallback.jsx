import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const EXCHANGE_FN = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/sso-exchange`;
const LANDING_URL = process.env.REACT_APP_LANDING_URL || 'https://apps.stellarglobalsupplies.com';
const MAX_AGE_MS  = 5 * 60 * 1000;

// ── Open-redirect guard ───────────────────────────────────────
function safeRedirect(redirect, fallback = '/') {
  try {
    const url = new URL(redirect, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return redirect.startsWith('/') ? redirect : fallback;
  }
}

export default function SSOCallback() {
  const [status, setStatus] = useState('Verifying your session…');
  const [error,  setError]  = useState(null);

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const token    = params.get('token');
    const ts       = Number(params.get('ts') || 0);
    const redirect = safeRedirect(params.get('redirect') || '/');

    if (ts && Date.now() - ts > MAX_AGE_MS) {
      setError('This sign-in link has expired. Please return to the portal.');
      return;
    }

    if (!token) {
      const callback = encodeURIComponent(window.location.origin + redirect);
      window.location.replace(`${LANDING_URL}/login?callback=${callback}`);
      return;
    }

    setStatus('Exchanging credentials…');

    fetch(EXCHANGE_FN, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Exchange failed (${res.status})`);
        return data;
      })
      .then(async ({ access_token, refresh_token }) => {
        setStatus('Setting up your workspace…');
        const { error: authErr } = await supabase.auth.setSession({ access_token, refresh_token });
        if (authErr) throw new Error(authErr.message);
        window.location.replace(redirect);
      })
      .catch(err => {
        setError(err.message || 'Sign-in failed. Please return to the portal.');
      });
  }, []);

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.logo}><span style={s.logoIcon}>SG</span><span style={s.logoText}>Stellar OMS</span></div>
          <p style={s.errorTitle}>Sign-in error</p>
          <p style={s.errorMsg}>{error}</p>
          <a href={LANDING_URL} style={s.btn}>Return to Portal</a>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}><span style={s.logoIcon}>SG</span><span style={s.logoText}>Stellar OMS</span></div>
        <span className="spinner spinner-dark" style={{ width: 32, height: 32, margin: '16px auto', display: 'block' }} />
        <p style={s.statusText}>{status}</p>
      </div>
    </div>
  );
}

const s = {
  page:       { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' },
  card:       { background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '40px 36px', textAlign: 'center', width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' },
  logo:       { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 },
  logoIcon:   { width: 36, height: 36, borderRadius: 8, background: '#00B98E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 },
  logoText:   { fontSize: 16, fontWeight: 700, color: '#0F172A' },
  statusText: { color: '#64748B', fontSize: 13 },
  errorTitle: { fontWeight: 700, color: '#0F172A', fontSize: 15, marginBottom: 8 },
  errorMsg:   { color: '#64748B', fontSize: 13, marginBottom: 20 },
  btn:        { display: 'inline-block', padding: '10px 28px', background: '#00B98E', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' },
};
