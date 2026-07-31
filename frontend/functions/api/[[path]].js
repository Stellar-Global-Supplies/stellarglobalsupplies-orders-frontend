/**
 * Cloudflare Pages Function — Proxy /api/* requests to the backend API Gateway.
 *
 * This function runs on Cloudflare's edge network and forwards all requests
 * matching /api/* to the actual API Gateway URL stored in the API_BASE_URL
 * environment variable. Because the browser sees the same origin
 * (orders.stellarglobalsupplies.com), no CORS preflight is needed.
 *
 * Environment variables (set in Cloudflare Pages dashboard):
 *   API_BASE_URL — the backend API Gateway base URL
 *                  (e.g. https://rjwx3tdkx3.execute-api.us-east-1.amazonaws.com)
 */

export async function onRequest(context) {
  const { request, env } = context;

  const apiBase = env.API_BASE_URL;
  if (!apiBase) {
    return new Response('API_BASE_URL environment variable not set', { status: 500 });
  }

  const url = new URL(request.url);
  // Strip the /api prefix from the pathname
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const target = new URL(`${apiBase}${path}${url.search}`);

  // Clone the incoming request headers and remove the host header
  // so the upstream server receives the correct host
  const headers = new Headers(request.headers);
  headers.delete('host');

  // Forward the request to the API Gateway
  const response = await fetch(target.toString(), {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
    redirect: 'follow',
  });

  // Return the response as-is (status, headers, body)
  return response;
}