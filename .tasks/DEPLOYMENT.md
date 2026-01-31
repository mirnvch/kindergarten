# Deployment Guide for Multi-App Setup

## Overview

The KinderCare project is structured as a Turborepo monorepo with 3 deployable apps:
- **web** - Public website (kindergarten.com)
- **portal** - Daycare owner/staff portal (portal.kindergarten.com)
- **admin** - Admin panel (admin.kindergarten.com)

## Current Status

The monolith app continues to work at the current deployment URL.
The separate apps are ready for deployment but currently serve as shells.

## Deployment Options

### Option A: Separate Vercel Projects (Recommended)

1. **Create projects on Vercel:**
   ```bash
   # From monorepo root
   cd apps/admin && vercel link
   cd apps/portal && vercel link
   cd apps/web && vercel link
   ```

2. **Configure environment variables** for each project in Vercel dashboard:
   - `DATABASE_URL` - Supabase connection string
   - `AUTH_SECRET` - NextAuth secret
   - `AUTH_GOOGLE_ID` - Google OAuth client ID
   - `AUTH_GOOGLE_SECRET` - Google OAuth client secret
   - `AUTH_COOKIE_DOMAIN` - Set to `.kindergarten.com` for cross-subdomain auth

3. **Configure custom domains** in Vercel:
   - web → kindergarten.com
   - portal → portal.kindergarten.com
   - admin → admin.kindergarten.com

4. **Update Google OAuth** redirect URLs in Google Console:
   - Add: https://kindergarten.com/api/auth/callback/google
   - Add: https://portal.kindergarten.com/api/auth/callback/google
   - Add: https://admin.kindergarten.com/api/auth/callback/google

### Option B: Deploy from Monorepo Root

Use the turbo-based deployment:
```bash
# Deploy admin
npx turbo deploy --filter=@kindergarten/admin

# Deploy portal
npx turbo deploy --filter=@kindergarten/portal

# Deploy web
npx turbo deploy --filter=@kindergarten/web
```

## Cross-Subdomain Authentication

For auth to work across subdomains, the cookie domain must be set to the parent domain:

```typescript
// packages/auth/src/index.ts
export const cookieConfig = {
  domain: process.env.AUTH_COOKIE_DOMAIN || undefined, // ".kindergarten.com"
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};
```

## Required DNS Records

| Type  | Name    | Value                    |
|-------|---------|--------------------------|
| A     | @       | 76.76.21.21              |
| CNAME | portal  | cname.vercel-dns.com     |
| CNAME | admin   | cname.vercel-dns.com     |

## Ports (Local Development)

- web: 3000
- portal: 3001
- admin: 3002

## Current Monolith

The monolith at `src/app/` continues to work and can be deployed as before.
Routes will be gradually migrated to individual apps.

## Migration Plan

1. ✅ Apps created and building
2. ⬜ Deploy apps to Vercel
3. ⬜ Configure custom domains
4. ⬜ Update OAuth settings
5. ⬜ Migrate routes from monolith to apps
6. ⬜ Retire monolith deployment
