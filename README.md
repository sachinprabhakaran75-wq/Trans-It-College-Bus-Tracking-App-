Trans-It Mono-repo

Structure:
- apps/student  (Next.js student PWA)
- apps/driver   (Next.js driver app)
- packages/ui   (shared UI primitives)

Next steps:
1. Install dependencies (npm install or pnpm)
2. Run `npm run dev` at repo root (requires turbo installed)
3. Add Next pages, Firebase config, and PWA manifest in apps/student and apps/driver

Note: firebase-service-account.json exists here for development only; rotate before production.
