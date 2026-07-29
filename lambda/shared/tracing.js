/**
 * SGS Orders (OMS) — OpenTelemetry Lambda Tracing
 * ─────────────────────────────────────────────────
 * Drop this file at lambda/shared/tracing.js and require it in each handler.
 *
 * Usage:
 *   const { tracedHandler, startSpan, withSpan } = require('../shared/tracing');
 *   exports.handler = tracedHandler('create-order', async (event, context) => { ... });
 *
 * What it does:
 *   • Initialises OTLPTraceExporter to New Relic EU endpoint once per cold start
 *   • Fetches NR license key from the OTEL_EXPORTER_OTLP_HEADERS env var
 *     (set by Terraform: `api-key=<key>`) — no extra SSM call needed
 *   • Creates a SERVER root span per invocation with HTTP attributes
 *   • Handles S3, EventBridge, HTTP API GW, and direct invoke events
 *   • Records exceptions and sets ERROR status automatically
 *   • force_flush() before Lambda freezes so spans always reach NR
 *   • Provides withSpan() helper for child spans (Supabase calls, S3, Gmail)
 */

'use strict';

const { NodeTracerProvider }            = require('@opentelemetry/sdk-trace-node');
const { BatchSpanProcessor }            = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter }             = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource }                      = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME }             = require('@opentelemetry/semantic-conventions');
const { W3CTraceContextPropagator }     = require('@opentelemetry/core');
const api                               = require('@opentelemetry/api');
const { SpanKind, SpanStatusCode, trace, context } = api;

// ── Module-level state — initialised once, reused on warm invocations ────────
let _provider = null;
let _tracer   = null;

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'sgs-orders-app';

function _initProvider() {
  if (_provider) return;

  // NR license key via env var set in Terraform:
  //   OTEL_EXPORTER_OTLP_HEADERS = "api-key=<eu01xx...>"
  // This avoids an extra SSM call in every Lambda cold start.
  const otlpHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';

  const resource = new Resource({
    [ATTR_SERVICE_NAME]:      SERVICE_NAME,
    'deployment.environment': process.env.ENVIRONMENT || 'production',
    'cloud.provider':         'aws',
    'faas.name':              process.env.AWS_LAMBDA_FUNCTION_NAME || SERVICE_NAME,
  });

  const exporter = new OTLPTraceExporter({
    url:     'https://otlp.eu01.nr-data.net:4318/v1/traces',
    headers: _parseOtlpHeaders(otlpHeaders),
    timeoutMillis: 2000,
  });

  _provider = new NodeTracerProvider({ resource });
  _provider.addSpanProcessor(
    new BatchSpanProcessor(exporter, {
      maxQueueSize:         512,
      maxExportBatchSize:   128,
      scheduledDelayMillis: 500,    // short — Lambda invocations are brief
      exportTimeoutMillis:  2000,
    }),
  );

  // Register W3C propagator so traceparent headers from the React SPA
  // create a linked frontend→Lambda trace in New Relic
  _provider.register({ propagator: new W3CTraceContextPropagator() });
  _tracer = trace.getTracer(SERVICE_NAME);
}

/** Parse "key1=val1,key2=val2" into { key1: 'val1', key2: 'val2' } */
function _parseOtlpHeaders(raw) {
  const headers = {};
  if (!raw) return headers;
  raw.split(',').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      headers[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    }
  });
  return headers;
}

function _getTracer() {
  _initProvider();
  return _tracer;
}

/** Detect event type and return a meaningful span name + attributes */
function _spanMeta(event, functionName) {
  const evt = event || {};

  // HTTP API Gateway v2
  const httpCtx = evt.requestContext?.http;
  if (httpCtx) {
    return {
      name:  `${httpCtx.method} ${evt.rawPath || '/'}`,
      kind:  SpanKind.SERVER,
      attrs: {
        'http.request.method':        httpCtx.method,
        'http.route':                 evt.routeKey || evt.rawPath || '/',
        'url.path':                   evt.rawPath  || '/',
        'aws.lambda.function_name':   functionName,
      },
    };
  }

  // S3 trigger
  const s3Rec = evt.Records?.[0];
  if (s3Rec?.eventSource === 'aws:s3') {
    return {
      name:  `S3 ${s3Rec.eventName}`,
      kind:  SpanKind.SERVER,
      attrs: {
        'aws.s3.bucket':            s3Rec.s3?.bucket?.name || '',
        'aws.s3.key':               s3Rec.s3?.object?.key  || '',
        'aws.lambda.function_name': functionName,
      },
    };
  }

  // EventBridge / Scheduled
  if (evt['detail-type']) {
    return {
      name:  `EventBridge ${evt['detail-type']}`,
      kind:  SpanKind.SERVER,
      attrs: {
        'eventbridge.detail_type':  evt['detail-type'],
        'eventbridge.source':       evt.source || '',
        'aws.lambda.function_name': functionName,
      },
    };
  }

  // Direct invoke / anything else
  return {
    name:  `INVOKE ${functionName}`,
    kind:  SpanKind.SERVER,
    attrs: { 'aws.lambda.function_name': functionName },
  };
}

/**
 * Main decorator — wraps an async Lambda handler with a root SERVER span.
 *
 * @param {string}   functionName  Human-readable name shown in NR (e.g. 'create-order')
 * @param {Function} handler       async (event, context) => response
 * @returns {Function}             wrapped handler safe to export as exports.handler
 */
function tracedHandler(functionName, handler) {
  return async function(event, context) {
    // Skip tracing for CORS preflight — no span overhead
    const method = event?.requestContext?.http?.method;
    if (method === 'OPTIONS') return handler(event, context);

    _initProvider();
    const tracer = _getTracer();

    // Extract W3C traceparent from incoming HTTP headers so the React SPA
    // and Lambda spans appear in the same NR distributed trace
    const headers  = event?.headers || {};
    const carrier  = { traceparent: headers.traceparent || '', tracestate: headers.tracestate || '' };
    const parentCtx = api.propagation.extract(context.active ? context.active() : api.context.active(), carrier);

    const { name, kind, attrs } = _spanMeta(event, functionName);

    return tracer.startActiveSpan(name, { kind, attributes: attrs }, parentCtx, async (span) => {
      try {
        const result = await handler(event, context);
        const statusCode = result?.statusCode ?? 200;
        if (attrs['http.request.method']) {
          span.setAttribute('http.response.status_code', statusCode);
        }
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: err?.message || String(err) });
        span.recordException(err);
        if (attrs['http.request.method']) {
          span.setAttribute('http.response.status_code', 500);
        }
        throw err;
      } finally {
        span.end();
        // Force-flush AFTER span.end() so the span is included in the batch
        try { await _provider.forceFlush(); } catch (_) {}
      }
    });
  };
}

/**
 * Create a child CLIENT span for an outbound call (Supabase, Gmail, S3).
 * Automatically ends the span and sets OK/ERROR status.
 *
 * @example
 * const data = await withSpan('supabase.orders.insert', { 'db.collection.name': 'orders' }, async (span) => {
 *   const { data, error } = await supabase.from('orders').insert(payload).select().single();
 *   if (error) throw error;
 *   return data;
 * });
 */
async function withSpan(name, attributes, fn) {
  const tracer = _getTracer();
  return tracer.startActiveSpan(name, { kind: SpanKind.CLIENT, attributes: attributes || {} }, async (span) => {
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

/**
 * Convenience wrapper specifically for Supabase PostgREST calls.
 * Automatically tags db.system, db.operation.name, db.collection.name.
 *
 * @example
 * const order = await supabaseSpan('orders', 'INSERT', () =>
 *   supabase.from('orders').insert(payload).select().single()
 * );
 */
async function supabaseSpan(table, operation, fn) {
  return withSpan(`${operation} supabase.${table}`, {
    'db.system':          'supabase',
    'db.provider':        'supabase',
    'db.operation.name':  operation,
    'db.collection.name': table,
    'db.sql.table':       table,
  }, async () => {
    const result = await fn();
    // Supabase JS returns { data, error } — surface error as span exception
    if (result?.error) throw result.error;
    return result?.data ?? result;
  });
}

module.exports = { tracedHandler, withSpan, supabaseSpan };
