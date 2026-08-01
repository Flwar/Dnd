# The Shattered Crown — הכתר המנופץ

The Shattered Crown is a Hebrew-first, RTL dark-fantasy RPG foundation built around authored branching narrative, deterministic dice and combat rules, cloud-backed characters, versioned saves, and cooperative party sessions.

The repository is designed for Next.js on Vercel or Cloudflare Workers through OpenNext, with Supabase providing PostgreSQL, Auth, Row Level Security, RPCs, and Realtime. Player-facing copy is Hebrew; internal identifiers and developer documentation use English.

## What is in the repository

- Hebrew account registration, login, logout, recovery, and password-reset flows backed by Supabase Auth.
- Protected menu and character routes using server-validated Supabase sessions.
- A seven-step character creator with six races, six classes, seven backgrounds, point buy, local draft resilience, and authoritative database creation.
- Authored opening-chapter content for ערפלון: locations, NPCs, dialogue branches, quests, items, encounters, a boss, and chapter scenes.
- Shared TypeScript rules for character building, d20 checks, inventory and equipment, quests, progression, combat, save migration, and party-command validation.
- PostgreSQL migrations with relational character state, versioned save snapshots, party sessions, command/event streams, idempotent rewards, indexes, constraints, and RLS.
- Local generated WebP art for scenes, portraits, abilities, and items. See [ASSET_CREDITS.md](./ASSET_CREDITS.md).
- Responsive Hebrew game UI components, reduced-motion support, local fonts, and a browser-safe procedural Web Audio manager.
- Vitest, React Testing Library, pgTAP-style SQL security checks, and Playwright configuration.

Detailed boundaries and data flows are in [ARCHITECTURE.md](./ARCHITECTURE.md). Instructions for extending authored content are in [CONTENT_GUIDE.md](./CONTENT_GUIDE.md).

## Release status and verification boundary

The application, database migration, deterministic game rules, authored chapter, server actions, Supabase adapters, Realtime subscriptions, Vercel workflow, and Cloudflare OpenNext configuration are implemented in source. `npm run db:validate` can verify migration loading, seed loading, character creation, transactional relational save synchronization, and idempotent save replay without Docker.

The repository deliberately contains no live Supabase project, SMTP, Vercel, or Cloudflare credentials. Therefore a successful local build does **not** prove hosted email delivery, cloud persistence under real JWTs, RLS between two users, Realtime reconnection, or an actual production deployment. The final release report must record the commands and hosted flows that were really exercised; absent target credentials, describe those flows as implemented but externally unverified.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4 and Framer Motion
- React Hook Form and Zod
- Zustand for scoped client game state
- Supabase Auth, PostgreSQL, Realtime, and SSR clients
- Vitest, React Testing Library, Playwright, and Supabase CLI database tests
- Vercel or Cloudflare Workers (through OpenNext) for application hosting

The exact installed versions are recorded in `package-lock.json`.

## Requirements

- Node.js 22.13 or newer
- npm
- Docker Desktop for the local Supabase stack
- A Supabase account and project for hosted cloud verification
- A Vercel account for Vercel deployment, or a Cloudflare account with Workers enabled for Cloudflare deployment

The Supabase CLI, OpenNext Cloudflare adapter, and Wrangler are locked project dependencies. The Vercel CLI may be run with `npx`; pin its version in CI instead of relying indefinitely on an unreviewed `latest` release.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values returned by local Supabase or the hosted project dashboard.

| Variable | Required | Exposure | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser and server | Supabase project API URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes, unless using the fallback | Browser and server | Current publishable key used by authenticated and anonymous clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Alternative | Browser and server | Accepted fallback for older Supabase projects; do not set it when the publishable key is available. |
| `NEXT_PUBLIC_SITE_URL` | Yes outside local defaults | Browser and server | Canonical origin used in metadata, email confirmation, and password recovery redirects. Do not include a trailing slash. |
| `SUPABASE_SECRET_KEY` | Yes for complete online play and chapter rewards | Server only | Preferred current key for authoritative party-command, item-use, loot, and reward resolution. Vercel's Supabase Marketplace integration injects it automatically. Never prefix it with `NEXT_PUBLIC_`, expose it to a Client Component, or commit it. |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy alternative | Server only | Accepted only as a compatibility fallback for older Supabase projects. Do not set it when `SUPABASE_SECRET_KEY` is available. |
| `SUPABASE_DB_URL` | Optional | Server/CLI only | Direct database connection string for manual administrative SQL where needed. Vercel Marketplace normally supplies `POSTGRES_URL_NON_POOLING` instead. `npm run db:validate` does not use either value. |

Never commit `.env.local`, `.dev.vars`, database passwords, Supabase secret/service-role keys, access tokens, or generated hosting credentials. `.dev.vars.example` contains only the non-secret OpenNext preview selector and is safe to copy.

## Local setup

Install dependencies:

```bash
npm ci
```

Start the local Supabase services:

```bash
npm run db:start
```

The command prints the local API URL and publishable/anon key. Put those values in `.env.local`. The default local endpoints in `supabase/config.toml` are:

- API: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- Inbucket email viewer: `http://127.0.0.1:54324`

Apply all migrations and the idempotent reward seed:

```bash
npm run db:reset
```

Then start Next.js:

```bash
npm run dev
```

Open `http://localhost:3000`. Local Auth has email confirmation disabled in `supabase/config.toml` for a short development loop. Hosted confirmation behavior is controlled in the Supabase dashboard.

Stop the local services when finished:

```bash
npm run db:stop
```

## Hosted Supabase setup

Create a Supabase project, keep its database password outside the repository, then authenticate and link the CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Inspect migrations before changing hosted state:

```bash
npx supabase db push --linked --dry-run
```

Apply migrations and the configured seed:

```bash
npx supabase db push --linked --include-seed
```

The seed creates only idempotent reward definitions. It intentionally creates no users or shared passwords. Register users through Supabase Auth or create isolated test users in a disposable test project.

In Supabase Auth URL Configuration, set the Site URL to the production origin and allow at least:

```text
http://localhost:3000/auth/callback
https://YOUR_DOMAIN/auth/callback
```

Preview deployments need their own allowed callback origin if they are used for authentication testing. Configure a production SMTP provider before relying on confirmation and recovery email delivery.

## Database and security

The canonical migration is under `supabase/migrations/`; seed data is in `supabase/seed.sql`. Do not edit a migration after it has been applied to a shared environment. Create a new one instead:

```bash
npx supabase migration new describe_the_change
```

All game tables have RLS enabled. Browser roles receive narrowly scoped `SELECT` or profile-update grants; sensitive writes go through validated, security-definer RPCs. The service-role key is reserved for trusted server-side command resolution and rewards.

Run the fast, Docker-free migration smoke test first:

```bash
npm run db:validate
```

This in-memory check loads the canonical migration and seed, verifies the expected table/policy/function/reward contract, and exercises character creation plus transactional save synchronization and duplicate replay. It does not emulate Supabase Auth, Realtime, or the complete RLS runtime.

Run Supabase's lint and SQL RLS/security suites against the local Docker stack separately:

```bash
npm run db:lint
npm run db:test
```

For an explicit test path, use:

```bash
npx supabase test db supabase/tests --local
```

## Quality commands

Run the local quality gates before a deployment:

```bash
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run build
```

Run browser tests separately because they start a development server and may require configured Auth users:

```bash
npx playwright install chromium
npm run test:e2e
```

Useful focused commands:

| Command | Scope |
| --- | --- |
| `npm run test:unit` | Deterministic game-domain tests. |
| `npm run test:integration` | Component and integration tests under `tests/integration`. |
| `npm run test:security` | Static migration-contract tests under `tests/security`. |
| `npm run test:e2e` | Playwright flows under `tests/e2e`. |
| `npm run db:validate` | Docker-free migration, seed, character-create, and transactional-save smoke test. |
| `npm run db:lint` | PostgreSQL migration linting. |
| `npm run db:test` | SQL security and RLS behavior tests. |
| `npm run cf:build` | Build the application through the Cloudflare OpenNext adapter. |
| `npm run cf:preview` | Build and run the result under local `workerd`. |
| `npm run cf:dry-run` | Build, bundle, and report the Worker upload size without deploying. |
| `npm run build` | Production Next.js build. |

`npm test` already runs the unit, integration, and migration-contract security projects; there is no need to invoke `test:integration` a second time in the same gate. A configured command is not evidence that its flow passed. Record the actual command output in the release report and do not describe remote Auth, saving, Realtime, or deployment as verified until exercised against the target Supabase and hosting environments.

The live Playwright specifications skip safely unless isolated verified test accounts are supplied. Use non-production accounts and keep these values outside Git:

```text
E2E_USER_EMAIL
E2E_USER_PASSWORD
E2E_PARTY_LEADER_EMAIL
E2E_PARTY_LEADER_PASSWORD
E2E_PARTY_MEMBER_EMAIL
E2E_PARTY_MEMBER_PASSWORD
```

Set `PLAYWRIGHT_BASE_URL` to exercise an already-running preview or deployed origin instead of starting `next dev`.

## Deploying to Vercel

Provision and migrate Supabase first. The Vercel Supabase Marketplace integration supplies `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and PostgreSQL connection variables automatically. If configuring the project manually, add the same variables for Preview and Production and keep all secret/database values server-only.

To apply committed migrations to a hosted project from a trusted administrative environment, set `RUN_HOSTED_MIGRATIONS=1` and provide `SUPABASE_DB_URL` or Vercel Marketplace's `POSTGRES_URL_NON_POOLING`, then run `npm run db:push:hosted`. The script does nothing unless the explicit guard is enabled, performs a dry-run preflight, uses the pinned local CLI, and redacts the connection URL from child-process output. Standalone Node scripts do not load `.env.local` automatically; export the values in the trusted shell or run through an environment-aware deployment job.

Deploy through the Vercel dashboard by importing the Git repository, or use the CLI:

```bash
npx vercel link
npx vercel
npx vercel --prod
```

After the production domain is known:

Connecting the Marketplace integration does not configure Supabase Auth redirect URLs for you.

1. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin in Vercel.
2. Add the same origin and `/auth/callback` URL to Supabase Auth URL Configuration.
3. Redeploy so build-time public variables use the final values.
4. Register a fresh user, verify email delivery as configured, create a character, save, sign out, sign in, and continue.
5. Use two independent authenticated browser contexts to verify party join, readiness, synchronized narrative/combat, refresh, and reconnection.
6. Inspect Vercel runtime logs, the browser console, and Supabase logs before promotion.

No Vercel token, Supabase credential, or production database secret belongs in Git.

For a controlled CI build, pull the target environment first, build, run the required gates, and deploy the exact prebuilt artifact:

```bash
npx vercel pull --yes --environment=production
npx vercel build --prod
npx vercel deploy --prebuilt --prod
```

Do not use `--prebuilt` with an artifact created for a different Vercel environment. Validate a preview URL before promoting it, and inspect runtime logs after the production alias changes.

Non-interactive Vercel CI also needs `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as CI-provider secrets. They are deployment credentials, not application runtime variables, and must not be added to `.env.example` or exposed to the browser.

## Deploying to Cloudflare Workers

Cloudflare support is additive: the normal `npm run build` output and the Vercel workflow above are unchanged. Cloudflare Workers uses the supported `@opennextjs/cloudflare` adapter, with committed configuration in `wrangler.jsonc` and `open-next.config.ts`.

The Auth request gate intentionally remains in `src/middleware.ts`. Next.js 16 prefers the renamed `proxy.ts` convention, but Proxy is fixed to the Node.js middleware runtime and OpenNext Cloudflare does not yet support Node.js middleware. The legacy middleware convention preserves the same matcher and session-refresh logic in the supported Edge middleware runtime; `next build` therefore emits a deprecation warning until OpenNext adds Node middleware support.

For a local Worker-runtime preview (the script builds before starting Wrangler):

```bash
copy .dev.vars.example .dev.vars
npm run cf:preview
```

Use `npm run cf:build` when only the adapter build gate is needed, or `npm run cf:dry-run` to validate the final Wrangler bundle and compressed Worker size without uploading it.

On macOS or Linux, replace `copy` with `cp`. Keep the Supabase values in the regular uncommitted Next.js environment file such as `.env.local`; `NEXTJS_ENV=development` in `.dev.vars` tells the Worker preview which Next.js environment to load. OpenNext has limited native-Windows support, so use WSL or a Linux CI runner if the adapter fails for a Windows-only path or file-system reason.

Check CLI authentication without deploying:

```bash
npx wrangler whoami
```

If Wrangler reports that no account is authenticated, run `npx wrangler login` interactively once, or configure a narrowly scoped `CLOUDFLARE_API_TOKEN` in CI. Never commit that token.

Before production deployment, configure these values in the Worker runtime settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon-key fallback)
- `NEXT_PUBLIC_SITE_URL`, set to the final HTTPS Worker or custom-domain origin
- `SUPABASE_SECRET_KEY` (or the legacy service-role fallback) as an encrypted Cloudflare secret, never as a public variable

The `NEXT_PUBLIC_...` values must also be available during the Next.js build because Next.js inlines them in browser bundles. When Cloudflare Workers Builds builds from Git, add them under **Build variables and secrets** as well as the Worker runtime settings. Every Cloudflare script explicitly selects `wrangler.jsonc`; dry-run, upload, and deploy also disable Wrangler autoconfiguration so stale output from another adapter cannot redirect a release. The deploy and upload scripts forward `--keep-vars` so dashboard-managed runtime values are not removed.

Deploy only after the Supabase migration and Auth callback setup are complete:

```bash
npm run cf:deploy
```

The current configuration enables minification, Worker static assets, Cloudflare observability, and the `IMAGES` binding required by `next/image`. Cloudflare Images can incur usage charges. No R2 incremental-cache bucket is provisioned: the current authenticated game routes are dynamic and persistent game data lives in Supabase. If future content adopts ISR or cached data revalidation, provision R2 and the matching OpenNext cache bindings before relying on cross-location cache invalidation.

After the first deployment, add `https://YOUR_WORKER_OR_DOMAIN/auth/callback` to Supabase Auth's redirect allow-list, update `NEXT_PUBLIC_SITE_URL`, rebuild, and repeat the same registration/save/reconnection checks listed for Vercel. See the current [Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) and [OpenNext Cloudflare guide](https://opennext.js.org/cloudflare/get-started) for platform-specific limits.

## Known release limitations

- The repository does not provision a Supabase project, custom SMTP provider, DNS, Vercel project, Cloudflare account, or production secrets.
- Complete online party resolution and chapter rewards require the server-only Supabase secret key (or legacy service-role key). The public key alone is intentionally insufficient.
- The MVP voting rule has no authoritative countdown: each member votes and the leader breaks a tie.
- Audio is currently generated procedurally through Web Audio; no recorded ambience or licensed sound pack is shipped.
- Cloudflare R2 incremental caching is not configured. Current authenticated game routes are dynamic and persistent game data remains in Supabase.
- OpenNext's native Windows toolchain can be less reliable than Linux; use WSL or Linux CI for the release build if `cf:build` fails for a platform-path reason.
- Live single-player and two-user party Playwright flows are skipped when their isolated account variables are absent. A skipped live test is not a hosted verification pass.

## Verification boundary

The repository does not contain live Supabase, Vercel, or Cloudflare credentials. Consequently, hosted registration email delivery, cloud persistence, RLS under real JWTs, Realtime behavior across two remote clients, and production hosting require external verification after credentials are supplied. Local deterministic tests, `db:validate`, `next build`, and `cf:build` reduce risk but do not replace that release check.

## Content and asset licensing

The rebuilt art pack is stored under `public/assets/rebuild` and addressed by stable manifest keys in `src/lib/assets/manifest.ts`. It is loaded locally rather than hotlinked. Review [ASSET_CREDITS.md](./ASSET_CREDITS.md) before commercial distribution and update it whenever an asset is added or replaced.

## License

No general source-code license is declared in this repository. Treat the code and project-specific content as proprietary unless the owner adds an explicit license.
