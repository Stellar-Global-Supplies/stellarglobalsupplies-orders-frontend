# Vercel Deployment Guide
## Stellar Global Supplies — Order Management System (React Frontend)

> **Note:** This is the primary deployment method. The frontend is deployed to Vercel, while the backend (Lambda + API Gateway) is managed separately.

---

## What Was Added

One file only:
```
frontend/vercel.json   ← tells Vercel the build config + SPA routing
```

---

## Step 1 — Push to GitHub

```bash
git add frontend/vercel.json
git commit -m "chore: add Vercel deployment config"
git push origin main
```

---

## Step 2 — Create a Vercel account

Go to [vercel.com](https://vercel.com) → **Sign Up** → choose **Continue with GitHub**.
No credit card required.

---

## Step 3 — Import the project

1. From the Vercel dashboard click **Add New → Project**
2. Find your repo `Stellar-Global-Supplies/stellarglobalsupplies-orders` and click **Import**
3. Under **Root Directory** click **Edit** and set it to:
   ```
   frontend
   ```
4. Vercel will auto-detect Create React App and show:
   - Build command: `npm run build`
   - Output directory: `build`

   These are correct — leave them.

---

## Step 4 — Add environment variables

Expand **Environment Variables** and add all 5:

| Variable | Value |
|---|---|
| `REACT_APP_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | your Supabase anon key |
| `REACT_APP_API_BASE_URL` | your API Gateway URL |
| `REACT_APP_WHATSAPP_NUMBER` | e.g. `+919876543210` |
| `REACT_APP_NR_LICENSE_KEY` | your New Relic key or `disabled` |

---

## Step 5 — Deploy

Click **Deploy**. Vercel will:
1. Run `npm install` (no strict lock file check — no more `npm ci` errors)
2. Run `npm run build`
3. Deploy to its global edge network

A successful deploy shows a live URL like:
```
https://stellar-oms.vercel.app
```

---

## Step 6 — Add your custom domain

1. Go to your project → **Settings → Domains**
2. Type `orders.stellarglobalsupplies.com` and click **Add**
3. Vercel shows you a CNAME record to add:

   | Type | Name | Value |
   |---|---|---|
   | `CNAME` | `orders` | `cname.vercel-dns.com` |

4. Go to **AWS Route53 → Hosted zones → stellarglobalsupplies.com → Create record**:
   - Record type: `CNAME`
   - Record name: `orders`
   - Value: `cname.vercel-dns.com`
   - TTL: `300`
5. Click **Create records**
6. Back in Vercel — it auto-detects the CNAME within a few minutes and provisions SSL

✅ Your app is now live at `https://orders.stellarglobalsupplies.com`

---

## Redeployments

Every `git push` to `main` triggers an automatic redeploy. No action needed.

To redeploy manually after changing env vars:
- Vercel dashboard → **Deployments** → **Redeploy**

> ⚠️ Env vars are baked in at build time — always redeploy after changing them.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Page refresh gives 404 | `vercel.json` rewrites handle this — confirm the file is in `frontend/` |
| Build fails | Check Root Directory is set to `frontend` in Vercel settings |
| API calls blocked (CORS) | Your API Gateway CORS already allows `orders.stellarglobalsupplies.com` ✅ |
| Env vars not working | Trigger a redeploy — they don't hot-reload |

---

*Stellar Global Supplies OMS — Vercel Deployment*