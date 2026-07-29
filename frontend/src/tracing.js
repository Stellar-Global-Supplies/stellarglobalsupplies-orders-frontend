/**
 * SGS Orders (OMS) — Browser OTLP Tracing
 * ─────────────────────────────────────────
 * CRA (Create React App) project — uses REACT_APP_ env vars, not VITE_.
 *
 * Call initTracing() at the very top of index.js BEFORE ReactDOM.createRoot().
 * Instruments:
 *   • All fetch() calls to the Lambda API — injects traceparent so NR links
 *     browser → Lambda spans in the same distributed trace
 *   • Supabase PostgREST calls (tagged db.provider=supabase, db.sql.table)
 *   • Document load timing
 *   • Web Vitals (LCP, FCP, CLS, TTFB) as spans
 *   • Page route changes (React Router)
 *   • JS errors and unhandled promise rejections
 *   • User identity after Supabase auth
 */

import {
  WebTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import {
  trace,
  context,
  SpanStatusCode,
  SpanKind,
} from '@opentelemetry/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const SERVICE_NAME   = 'sgs-orders-frontend';
const NR_ENDPOINT    = 'https://otlp.eu01.nr-data.net:4318/v1/traces';

// Set in .env: REACT_APP_NR_LICENSE_KEY=eu01xx...
const NR_LICENSE_KEY = process.env.REACT_APP_NR_LICENSE_KEY;
const API_BASE       = process.env.REACT_APP_API_BASE_URL || '';
const NODE_ENV       = process.env.NODE_ENV || 'production';

let _provider = null;
let _tracer   = null;
let _userId   = null;
let _userEmail = null;

// ── Init ──────────────────────────────────────────────────────────────────────

export function initTracing() {
  if (_provider) return;

  if (!NR_LICENSE_KEY) {
    console.warn('[tracing] REACT_APP_NR_LICENSE_KEY not set — spans will not export to New Relic.');
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]:      SERVICE_NAME,
    'deployment.environment': NODE_ENV,
    'browser.user_agent':     navigator.userAgent,
    'browser.language':       navigator.language,
  });

  _provider = new WebTracerProvider({ resource });

  // Export to New Relic
  if (NR_LICENSE_KEY) {
    _provider.addSpanProcessor(
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url:     NR_ENDPOINT,
          headers: { 'api-key': NR_LICENSE_KEY },
        }),
        {
          scheduledDelayMillis: 3000,
          maxExportBatchSize:   30,
          maxQueueSize:         200,
          exportTimeoutMillis:  10000,
        },
      ),
    );
  }

  // Console in development
  if (NODE_ENV === 'development') {
    _provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  _provider.register({
    contextManager: new ZoneContextManager(),
    propagator:     new W3CTraceContextPropagator(),
  });

  // ── Auto-instrumentation ───────────────────────────────────────────────────
  registerInstrumentations({
    tracerProvider: _provider,
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-fetch': {
          enabled: true,
          // Inject traceparent into Lambda API calls so NR links browser→Lambda
          propagateTraceHeaderCorsUrls: API_BASE
            ? [new RegExp(API_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))]
            : [],
          applyCustomAttributesOnSpan(span, request, response) {
            const url = typeof request === 'string' ? request : request?.url ?? '';

            // Tag Supabase calls
            if (url.includes('supabase.co')) {
              span.setAttribute('db.system',   'postgresql');
              span.setAttribute('db.provider', 'supabase');
              const table = url.match(/\/rest\/v1\/([^?]+)/)?.[1];
              if (table) span.setAttribute('db.sql.table', table);
            }

            // Tag Lambda API calls
            if (API_BASE && url.startsWith(API_BASE)) {
              span.setAttribute('sgs.api.route', url.replace(API_BASE, ''));
            }

            if (response instanceof Response && !response.ok) {
              span.setAttribute('http.response.status_code', response.status);
              span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${response.status}` });
            }

            if (_userId)    span.setAttribute('user.id',    _userId);
            if (_userEmail) span.setAttribute('user.email', _userEmail);
          },
          ignoreUrls: [
            /supabase\.co\/auth\/v1\/token/,
            /supabase\.co\/realtime/,
            /\/sw\.js/,
            /manifest\.json/,
          ],
        },
        '@opentelemetry/instrumentation-xml-http-request': {
          // XHR used for invoice multipart upload (deliverOrder uses FormData)
          enabled: true,
          applyCustomAttributesOnSpan(span) {
            span.setAttribute('sgs.transport', 'xhr');
            if (_userId) span.setAttribute('user.id', _userId);
          },
        },
        '@opentelemetry/instrumentation-document-load': { enabled: true },
        '@opentelemetry/instrumentation-user-interaction': { enabled: false },
      }),
    ],
  });

  _tracer = trace.getTracer(SERVICE_NAME);

  // ── Global error capture ───────────────────────────────────────────────────
  window.addEventListener('error', (ev) => {
    const span = _tracer.startSpan('js.error', { kind: SpanKind.CLIENT });
    span.setStatus({ code: SpanStatusCode.ERROR, message: ev.message });
    span.recordException(ev.error ?? new Error(ev.message));
    span.setAttribute('error.type', 'uncaught_exception');
    if (_userId) span.setAttribute('user.id', _userId);
    span.end();
  });

  window.addEventListener('unhandledrejection', (ev) => {
    const span = _tracer.startSpan('js.unhandled_rejection', { kind: SpanKind.CLIENT });
    const err  = ev.reason instanceof Error ? ev.reason : new Error(String(ev.reason));
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    span.recordException(err);
    span.setAttribute('error.type', 'unhandled_promise_rejection');
    if (_userId) span.setAttribute('user.id', _userId);
    span.end();
  });

  // ── Web Vitals ─────────────────────────────────────────────────────────────
  _captureWebVitals();

  // ── Flush on page hide ─────────────────────────────────────────────────────
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _provider?.forceFlush?.();
  });
  window.addEventListener('pagehide', () => _provider?.forceFlush?.());

  console.info(`[tracing] Initialised — service=${SERVICE_NAME} env=${NODE_ENV}`);
}

// ── Web Vitals ────────────────────────────────────────────────────────────────

function _captureWebVitals() {
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const span = _tracer.startSpan(`web_vital.${entry.name.toLowerCase().replace(/-/g, '_')}`, {
          kind: SpanKind.CLIENT, startTime: entry.startTime,
        });
        span.setAttribute('web_vital.name',     entry.name);
        span.setAttribute('web_vital.value_ms', Math.round(entry.startTime));
        span.setAttribute('web_vital.rating',   entry.startTime < 2500 ? 'good' : entry.startTime < 4000 ? 'needs-improvement' : 'poor');
        span.end(entry.startTime);
      }
    }).observe({ type: 'paint', buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const span = _tracer.startSpan('web_vital.lcp', { kind: SpanKind.CLIENT, startTime: entry.startTime });
        span.setAttribute('web_vital.name',     'LCP');
        span.setAttribute('web_vital.value_ms', Math.round(entry.startTime));
        span.setAttribute('web_vital.rating',   entry.startTime < 2500 ? 'good' : entry.startTime < 4000 ? 'needs-improvement' : 'poor');
        span.end(entry.startTime);
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((list) => {
      let cls = 0;
      for (const e of list.getEntries()) cls += (e.value ?? 0);
      if (cls > 0) {
        const span = _tracer.startSpan('web_vital.cls', { kind: SpanKind.CLIENT });
        span.setAttribute('web_vital.name',   'CLS');
        span.setAttribute('web_vital.value',  cls);
        span.setAttribute('web_vital.rating', cls < 0.1 ? 'good' : cls < 0.25 ? 'needs-improvement' : 'poor');
        span.end();
      }
    }).observe({ type: 'layout-shift', buffered: true });

    const [nav] = performance.getEntriesByType('navigation');
    if (nav) {
      const ttfb = nav.responseStart - nav.requestStart;
      const span = _tracer.startSpan('web_vital.ttfb', { kind: SpanKind.CLIENT, startTime: nav.requestStart });
      span.setAttribute('web_vital.name',     'TTFB');
      span.setAttribute('web_vital.value_ms', Math.round(ttfb));
      span.setAttribute('web_vital.rating',   ttfb < 800 ? 'good' : ttfb < 1800 ? 'needs-improvement' : 'poor');
      span.end(nav.responseStart);
    }
  } catch (_) {}
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Set authenticated user — call after supabase.auth.getSession() resolves.
 * All subsequent spans will carry user.id and user.email attributes.
 */
export function setUser(userId, email) {
  _userId    = userId   || null;
  _userEmail = email    || null;
}

/** Clear user identity on sign-out */
export function clearUser() {
  _userId    = null;
  _userEmail = null;
}

/**
 * Record a page/route navigation.
 * Call from React Router's useLocation() effect or from each page component.
 *
 * @example
 * // In App.jsx after BrowserRouter:
 * function RouteTracker() {
 *   const location = useLocation();
 *   useEffect(() => { recordNavigation(location.pathname); }, [location]);
 *   return null;
 * }
 */
export function recordNavigation(path, prevPath) {
  if (!_tracer) return;
  const span = _tracer.startSpan('sgs.navigate', { kind: SpanKind.CLIENT });
  span.setAttribute('sgs.page',      path);
  span.setAttribute('sgs.prev_page', prevPath || '');
  if (_userId)    span.setAttribute('user.id',    _userId);
  if (_userEmail) span.setAttribute('user.email', _userEmail);
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

/**
 * Record order lifecycle events as spans.
 * Call at key business moments (order created, status changed, email sent etc.)
 *
 * @example
 * recordOrderEvent('order.created',   { 'order.id': order.id });
 * recordOrderEvent('order.delivered', { 'order.id': id, 'order.payment_status': ps });
 */
export function recordOrderEvent(eventName, attributes) {
  if (!_tracer) return;
  const span = _tracer.startSpan(`sgs.${eventName}`, { kind: SpanKind.CLIENT });
  if (attributes) {
    for (const [k, v] of Object.entries(attributes)) {
      if (v !== undefined && v !== null) span.setAttribute(k, v);
    }
  }
  if (_userId)    span.setAttribute('user.id',    _userId);
  if (_userEmail) span.setAttribute('user.email', _userEmail);
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

/**
 * Run an async function inside a named span.
 * Handles success/error/end automatically.
 */
export async function withSpan(name, fn, attributes) {
  if (!_tracer) return fn(null);
  const span = _tracer.startSpan(name, { kind: SpanKind.CLIENT, attributes: attributes || {} });
  if (_userId) span.setAttribute('user.id', _userId);
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: err?.message || String(err) });
      span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  });
}
