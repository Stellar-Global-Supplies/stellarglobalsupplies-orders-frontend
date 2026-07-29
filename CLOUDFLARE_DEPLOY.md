# Cloudflare Pages Deployment Guide
## Stellar Global Supplies — Order Management System (React Frontend)

> **Note:** This is an alternative deployment method. The frontend can be deployed to Cloudflare Pages instead of Vercel, while the backend (Lambda + API Gateway) is managed separately.

---

## What Was Added

Two files:
```
frontend/public/_redirects   ← SPA routing for Cloudflare Pages
frontend/wrangler.toml       ← Cloudflare Pages build config
```

The `_redirects` file is the Cloudflare Pages equivalent of Vercel's `rewrites`. It ensures all routes serve `index.html` with HTTP 200, so deep links and page refreshes don't return 404.

---

## Step 1 — Push to GitHub

```bash
git add frontend/public/_redirects frontend/wrangler.toml CLOUDFLARE_DEPLOY.md
git commit -m "chore: add Cloudflare Pages deployment config"
git push origin main
```

---

## Step 2 — Create a Cloudflare account

Go to [cloudflare.com](https://cloudflare.com) → **Sign Up**.
No credit card required — Cloudflare Pages has a generous free tier.

---

## Step 3 — Create a Pages project

1. From the Cloudflare dashboard, go to **Workers & Pages**
2. Click **Create application** → **Pages** → **Connect to Git**
3. Connect your GitHub account and select your repo `Stellar-Global-Supplies/cloudflare_orders_app`
4. Under **Root directory** set it to:
   ```
   frontend
   ```
5. Cloudflare will auto-detect the build settings. Confirm they match:
   - **Framework preset**: `Create React App`
   - **Build command**: `npm run build`
   - **Build output directory**: `build`

   These are correct — leave them.

---

## Step 4 — Add environment variables

Expand **Environment variables** and add all 4:

| Variable | Value |
|---|---|
| `REACT_APP_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | your Supabase anon key |
| `REACT_APP_API_BASE_URL` | your API Gateway URL |
| `REACT_APP_WHATSAPP_NUMBER` | e.g. `919637655556` |

> ⚠️ Environment variables are baked in at build time. After changing them, you must trigger a new deployment for the changes to take effect.

---

## Step 5 — Deploy

Click **Save and Deploy**. Cloudflare Pages will:
1. Run `npm install`
2. Run `npm run build`
3. Deploy the `build/` directory to its global edge network

A successful deploy shows a live URL like:
```
https://stellar-oms.pages.dev
```

---

## Step 6 — Add your custom domain

1. Go to your Pages project → **Custom domains** → **Set up a custom domain**
2. Type `orders.stellarglobalsupplies.com` and click **Continue**
3. If your domain is already on Cloudflare, the DNS record is added automatically.
   If not, Cloudflare shows you a CNAME record to add:

   | Type | Name | Value |
   |---|---|---|
   | `CNAME` | `orders` | `stellar-oms.pages.dev` |

4. If adding manually, go to **AWS Route53 → Hosted zones → stellarglobalsupplies.com → Create record**:
   - Record type: `CNAME`
   - Record name: `orders`
   - Value: `stellar-oms.pages.dev`
   - TTL: `300`
5. Click **Create records**
6. Back in Cloudflare — it auto-detects the CNAME within a few minutes and provisions SSL automatically

✅ Your app is now live at `https://orders.stellarglobalsupplies.com`

---

## Redeployments

Every `git push` to `main` triggers an automatic redeploy. No action needed.

To redeploy manually after changing env vars:
- Cloudflare Pages dashboard → **Deployments** → **Retry deployment**

> ⚠️ Env vars are baked in at build time — always redeploy after changing them.

---

## SPA Routing

Cloudflare Pages handles SPA routing via the `frontend/public/_redirects` file:

```
/*    /index.html   200
```

This file is copied into `build/` during the CRA build and tells Cloudflare Pages to serve `index.html` for all routes with HTTP 200. This ensures:
- Deep links (e.g. `/orders/123`) work on refresh
- The `/track/:token` public tracking URLs work when shared
- No 404 errors on client-side routes

---

## Local Preview with Wrangler

You can preview the production build locally using Cloudflare's Wrangler CLI:

```bash
cd frontend
npm run build
npx wrangler pages dev build
```

This starts a local server that respects `_redirects` just like production.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Page refresh gives 404 | Confirm `frontend/public/_redirects` exists and contains `/* /index.html 200` |
| Build fails | Check Root Directory is set to `frontend` in Cloudflare Pages settings |
| API calls blocked (CORS) | Your API Gateway CORS must allow `orders.stellarglobalsupplies.com` (or `*.pages.dev` for preview) |
| Env vars not working | Trigger a redeploy — they don't hot-reload |
| `_redirects` not working | Ensure the file is in `frontend/public/` so CRA copies it to `build/` |

---

## Comparison: Vercel vs Cloudflare Pages

| Feature | Vercel | Cloudflare Pages |
|---|---|---|
| SPA routing | `vercel.json` rewrites | `public/_redirects` |
| Build config | `vercel.json` | `wrangler.toml` (optional) |
| Free tier | 100GB bandwidth | Unlimited bandwidth |
| Edge network | Vercel Edge | Cloudflare Edge (300+ cities) |
| Custom domains | ✅ | ✅ |
| Auto SSL | ✅ | ✅ |
| Git integration | ✅ | ✅ |

---

*Stellar Global Supplies OMS — Cloudflare Pages Deployment*