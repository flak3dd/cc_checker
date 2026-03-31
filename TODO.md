# Fix CC Checker App Crash (Backend DB + Frontend Resilience)

## Status: Backend DB Missing → App crashes on API fail

**Progress:**
- [ ] 1. Backend: Vercel Postgres setup
- [ ] 2. Frontend: Error boundaries & offline mode
- [ ] 3. Test health endpoint
- [ ] 4. Verify app launch

## 1. Backend Fix (Option B - Vercel Prod - SELECTED)

**Project**: https://vercel.com/projects/cc-checker-nhlrvq7a5-jacks-projects-36c61380.vercel.app

```
→ Settings → Environment Variables → Add ALL:
  NEXT_PUBLIC_SUPABASE_URL=https://vbvbwwmqfyyrxvkzerzd.supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_CJk3xv6tspbeMupwHRX45w_2_ZQ3x8j
  POSTGRES_URL=postgresql://postgres:Xanax P0wder1!@db.vbvbwwmqfyyrxvkzerzd.supabase.co:5432/postgres

→ Deployments → Redeploy (Trigger Production Deployment)

→ Protection → Turn OFF or set Password (share if needed)
```

Test:
```bash
curl https://cc-checker-nhlrvq7a5-jacks-projects-36c61380.vercel.app/api/health
# Expect: {\"status\":\"ok\"}
```

**Note**: Supabase connection string has space - URL encode if needed: Xanax%20P0wder1!

## 2. Frontend Resilience (After backend)

ErrorBoundary + query suspension on !isConnected.

## Current Step: 1/4 Backend DB
