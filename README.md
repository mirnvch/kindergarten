# DocConnect

Healthcare provider discovery and appointment booking platform.

## Tech Stack

| Category   | Technology                |
| ---------- | ------------------------- |
| Framework  | Next.js 16.x (App Router) |
| Language   | TypeScript 5.x (strict)   |
| Styling    | Tailwind CSS 4.x          |
| Database   | PostgreSQL (Supabase)     |
| ORM        | Prisma 7.x                |
| Auth       | NextAuth.js 5.x (beta)    |
| Email      | Resend                    |
| Payments   | Stripe                    |
| Real-time  | Pusher                    |
| Caching    | Upstash Redis             |
| Testing    | Vitest + Playwright       |
| Deployment | Vercel                    |

## Quick Start

### Prerequisites

- Node.js 22+
- npm 10+
- Git

### Setup (5 minutes)

```bash
# 1. Clone the repository
git clone <repository-url>
cd doccontent

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values (see docs/setup/environment.md)

# 4. Set up database
npm run db:generate
npm run db:push

# 5. Seed the database (optional - for development)
npx prisma db seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Required Environment Variables

```bash
# Database (Supabase)
DATABASE_URL="postgresql://..."    # Transaction Pooler (port 6543)
DIRECT_URL="postgresql://..."      # Session Pooler (port 5432)

# Auth
AUTH_SECRET="your-secret"          # Generate: openssl rand -base64 32
AUTH_GOOGLE_ID="..."               # Google OAuth Client ID
AUTH_GOOGLE_SECRET="..."           # Google OAuth Client Secret

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

See [docs/setup/environment.md](docs/setup/environment.md) for all variables.

## Test Accounts

After running `npx prisma db seed`:

| Role     | Email                   | Password |
| -------- | ----------------------- | -------- |
| Patient  | patient1@docconnect.com | Test123! |
| Patient  | patient2@docconnect.com | Test123! |
| Provider | provider@docconnect.com | Test123! |
| Admin    | admin@docconnect.com    | Test123! |

## Project Structure

```
src/
├── app/                   # Next.js App Router
│   ├── (auth)/           # Login, register
│   ├── (marketing)/      # Public pages
│   ├── (parent)/         # Patient dashboard
│   ├── (portal)/         # Provider portal
│   └── (admin)/          # Admin panel
├── components/           # React components
│   ├── ui/              # shadcn/ui primitives
│   ├── admin/           # Admin-specific
│   ├── portal/          # Portal-specific
│   └── [feature]/       # Feature-specific
├── lib/                  # Utilities
│   ├── auth.ts          # NextAuth config
│   ├── db.ts            # Prisma client
│   └── ...
├── server/
│   ├── actions/         # Server Actions
│   ├── services/        # Business logic
│   └── validators/      # Zod schemas
└── types/               # TypeScript types
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npm run lint             # Run ESLint
npm run typecheck        # TypeScript check
npm run validate         # lint + typecheck + format check

# Testing
npm run test             # Unit tests (watch mode)
npm run test:run         # Unit tests (single run)
npm run test:coverage    # Unit tests with coverage
npm run test:e2e         # E2E tests

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run migrations (production)
```

## Documentation

| Topic                 | Path                                                           |
| --------------------- | -------------------------------------------------------------- |
| Getting Started       | [docs/setup/getting-started.md](docs/setup/getting-started.md) |
| Environment Variables | [docs/setup/environment.md](docs/setup/environment.md)         |
| Architecture Overview | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Backend Guide         | [docs/guides/backend.md](docs/guides/backend.md)               |
| Frontend Guide        | [docs/guides/frontend.md](docs/guides/frontend.md)             |
| Testing Guide         | [docs/guides/testing.md](docs/guides/testing.md)               |
| Security Guide        | [docs/guides/security.md](docs/guides/security.md)             |
| ADRs                  | [docs/architecture/adr/](docs/architecture/adr/)               |

## Deployment

The app is deployed on Vercel:

- **Production**: https://www.toddlerhq.com
- **Preview**: Auto-deployed for every PR

### Deploy to Production

```bash
vercel --prod
```

## Troubleshooting

### Port 3000 is already in use

```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>
```

### Prisma errors

```bash
# Regenerate Prisma client
npm run db:generate

# Reset database (development only)
npx prisma db push --force-reset
```

### Node modules issues

```bash
rm -rf node_modules package-lock.json
npm install
```

### Database connection issues

- Verify `DATABASE_URL` points to Transaction Pooler (port 6543)
- Verify `DIRECT_URL` points to Session Pooler (port 5432)
- Check Supabase dashboard for connection limits

## Contributing

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run tests: `npm run validate && npm run test:run`
4. Commit with conventional commits: `git commit -m "feat: add new feature"`
5. Push and create a PR

## License

Private - All rights reserved.
