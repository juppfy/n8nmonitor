## Deployment Guide (Vercel • Railway • DigitalOcean)

Use this guide to deploy the app on Vercel, Railway, or DigitalOcean App Platform. It covers required env vars, build commands, routing (to avoid 404s on refresh), database setup, and post-deploy checks.

### 1) Prerequisites (all platforms)
- Node.js 18+ locally.
- A PostgreSQL instance for production (recommended over SQLite). Each platform can provision one.
- A `.env` file created from `env.example` (never commit secrets). Example command: `cp env.example .env` then fill values.
- Secrets to generate (run locally):  
  - `BETTER_AUTH_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`  
  - `ENCRYPTION_KEY` (32-byte hex): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`  
  - VAPID keys for push: `npx web-push generate-vapid-keys`
- Run migrations before first start in each environment: `npx prisma migrate deploy`

### 2) Required environment variables
Set these in each platform’s dashboard/secrets manager (do not hardcode).

| Name | Notes |
| --- | --- |
| `DATABASE_URL` | PostgreSQL URL from your platform. |
| `NEXT_PUBLIC_APP_URL` | Public URL of the deployment (e.g., `https://your-app.vercel.app`). |
| `BETTER_AUTH_SECRET` | Generated secret above. |
| `BETTER_AUTH_URL` | Same as `NEXT_PUBLIC_APP_URL`. |
| `ENCRYPTION_KEY` | 32-byte hex string generated above. |
| `RESEND_API_KEY` | Optional; needed for email notifications. |
| `RESEND_FROM_EMAIL` | Required if using Resend (e.g., `noreply@yourdomain.com`). |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | From VAPID generation. |
| `VAPID_PRIVATE_KEY` | From VAPID generation. |
| `VAPID_EMAIL` | `mailto:admin@yourdomain.com`. |
| `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_MS` | Optional rate limiting knobs. |

### 3) Common build/run commands
- Install deps: `npm install`
- Build: `npm run build`
- Start: `npm run start` (Next.js server; honors `PORT`)
- Migrations: `npx prisma migrate deploy`
- Health check: open `/setup` on first run to create the admin.

### 4) Routing / 404 prevention on refresh
The app uses Next.js App Router. When deployed as a Node server (all platforms below), refreshes on nested routes will work if all traffic routes to the app service:
- Ensure there is a single catch-all route (`/*`) pointing to the service on Railway and DigitalOcean App Platform. Vercel handles this automatically.
- Avoid static file hosting for the app; it must run the Next.js server.

### 5) Platform-specific steps

#### A) Vercel
1) Import the Git repository in Vercel.  
2) Set Environment Variables (Project Settings → Environment Variables) using the table above.  
3) Database: create a Vercel Postgres or supply an external Postgres `DATABASE_URL`.  
4) Build & Output: Vercel defaults are fine (`npm install`, `npm run build`).  
5) After first deploy, run migrations once: `vercel exec -- npx prisma migrate deploy` (or run from any machine with the same env).  
6) Verify: open the deployment URL → `/setup` to create the admin.  
7) Optional: enable “Force redirect to primary domain” to keep `NEXT_PUBLIC_APP_URL` stable.

#### B) Railway
1) Create a new Railway project → Add a Postgres plugin. Copy its `DATABASE_URL`.  
2) Deploy the repo (GitHub connect or `railway up`).  
3) Set Variables (Project → Variables): all required env vars above, plus `PORT=3000` if Railway doesn’t inject it. Set `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` to the Railway domain.  
4) Build & Start commands:  
   - Build: `npm run build`  
   - Start: `npm run start`  
5) Migrations: in Railway “Shell” run `npx prisma migrate deploy` after env vars are set. You can also add a Deploy Hook/Start Command to run migrations before start.  
6) Routing: ensure a catch-all route is configured (Railway forwards all paths to the service by default; nothing extra typically needed).  
7) Verify at the assigned domain → `/setup`.

#### C) DigitalOcean App Platform
1) Create a new App from the Git repo.  
2) Add a Postgres database component; copy its connection string into `DATABASE_URL`.  
3) Service settings:  
   - Runtime: Node.js 18+  
   - Build command: `npm run build`  
   - Run command: `npm run start`  
   - HTTP Port: 3000 (or match `PORT` DO injects)  
4) Environment Variables: add all required vars; set `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` to the App Platform domain.  
5) Routing: in “Routes”, map `/*` to this service to avoid 404s on refresh.  
6) Migrations: add a post-deploy job/command `npx prisma migrate deploy` (DO supports post-deploy commands) or run it manually via console after first deploy.  
7) Verify at the app URL → `/setup`.

### 6) Optional hardening / production tips
- Switch Prisma to PostgreSQL in `prisma/schema.prisma` if still on SQLite. Update `DATABASE_URL` accordingly.  
- Consider setting `output: 'standalone'` in `next.config.js` for lighter runtime bundles on non-Vercel hosts.  
- Configure a custom domain and update `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`.  
- Set up Resend domain verification before enabling email notifications.  
- Push notifications: ensure VAPID keys are set and service workers are allowed on your domain (HTTPS required).

### 7) Post-deploy checklist
- `/setup` loads and creates the admin successfully.  
- Emails send (if configured) and land in inbox/spam as expected.  
- Push notifications permission prompt works; test subscribe/unsubscribe.  
- Dashboard pages do not 404 on refresh for nested routes.  
- `npx prisma migrate deploy` has been run in the target environment.  
- Health check responds on `/` (or configure a lightweight `/api/health` if your platform requires one).

