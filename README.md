# SEES Platform

The Society website, member space and editorial workspace in one TypeScript monorepo.

Repository: [seestechhub/sees-website-v2](https://github.com/seestechhub/sees-website-v2). Frontend, Express API, worker and database migrations share this repository.

- `apps/web`: Next.js App Router. Pages load data on the server; small client forms use Server Actions.
- `apps/api`: Express 5, PostgreSQL, Argon2id passwords, opaque revocable sessions and a separate worker.
- `database/migrations`: numbered, forward-only PostgreSQL schema history. No Supabase dependency.
- `PRD.md`: product direction. `BUILD_STATUS.md`: implemented scope and remaining work.

The existing SEES Tech Hub and old Society website repositories are separate projects.

## Local setup

Use Node 22 and npm. Run `npm ci` once at the repository root; dependencies are shared by both workspaces.

1. Copy `apps/api/.env.example` to `apps/api/.env` and `apps/web/.env.example` to `apps/web/.env.local`.
2. Generate an encryption key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep it private. The API and worker must use the same key.
3. Use an existing local PostgreSQL 16+ database, or explicitly start the optional database with `docker compose up -d db` after setting `POSTGRES_PASSWORD`. Compose exposes only `127.0.0.1:5549`; set `DATABASE_URL` accordingly. It does not apply the schema.
4. Review the SQL files. The operator runs `npm run migrate --workspace @sees/api` from the root when ready. The migrator records each filename and serializes runners with a database lock. New databases only: the first run creates the schema; existing databases get only missing migrations. Never change an applied migration.
5. Run `npm run dev`. Frontend: `http://localhost:3108`; API: `http://localhost:4108/health`.
6. Start the worker separately with `npm run worker --workspace @sees/api` for scheduled publishing and queued account emails.

To provision the first owner, set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (15+ characters) and `ADMIN_NAME` in the process environment, then run `npm run admin:create --workspace @sees/api`. Privately enroll the displayed authenticator URI. No default credentials or public administrator registration exist. Bootstrap refuses to run if any admin already exists. Administrator invitation/recovery management is still pending.

On this Windows machine, the global npm wrapper exited silently during checks. The bundled entry point worked: `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" <command>`. The repository also supports `node scripts/tasks.mjs typecheck`, `node scripts/tasks.mjs build` and `node scripts/dev.mjs`, which invoke local tools directly.

## Verification

```text
npm run typecheck
npm run build
npm test
```

The integration suite requires `NODE_ENV=test`, an encryption key, `WEB_ORIGIN=http://localhost:3108`, and `DATABASE_URL` targeting **exactly** a local database named `sees_platform_test`. It applies migrations only there and removes its synthetic rows before/after execution. Never point it at development, staging or production data. Use `node --env-file=<private-test-env> scripts/tasks.mjs test` to supply test settings.

## Publishing content

Sign in at `/admin/login` with email, password and an authenticator code. Editors can draft, publish, schedule and archive journal posts, events, resources, executive profiles, subbodies and pages. Content is plain text in this increment. Editing an outdated version returns a conflict. All editorial dates use Lagos time (WAT); the database stores UTC.

Publish a `page` with URL name `president-address` for the President's message. Approved page content is served at `/pages/<url-name>`. Supply real names, pictures, resource permissions and event details through the editor; no synthetic leadership roster is seeded.

Level-specific resources must be members only. At this stage the server protects their page bodies and destination links; a destination hosted publicly elsewhere is still publicly accessible to anyone who already has its URL. Private uploaded files and expiring signed downloads are pending.

## Email adapter

No external email service is configured or contacted by default. Account verification, recovery and subscription confirmation requests are encrypted into `outbox`. Without a configured adapter, the worker leaves them queued. For local integration tests, tokens are inspected only through the test process; there is no public token-reading endpoint.

The worker sends `POST MAIL_WEBHOOK_URL` with `Authorization: Bearer <MAIL_WEBHOOK_SECRET>`, `Idempotency-Key: <outbox UUID>`, and JSON `{id,to,subject,text}`. The chosen adapter must authenticate the request and honor that idempotency key. API and worker encryption keys must match. HTTPS is required in production. A successful response records **accepted**, not delivered. Timeouts/interrupted attempts become **uncertain** and require provider reconciliation before retrying. Rejections are recorded as failed. Automatic retry, provider callbacks and a real adapter are not implemented yet.

Newsletter subscriptions are separate from member identities and require confirmation. Publication does not send a campaign. Campaign preparation, audience eligibility rechecks, provider suppression, RFC 8058 headers and send confirmation are still future work; do not use this outbox as an improvised bulk mailer.

## Deployment layout

`render.yaml` describes an Express service, worker and managed Postgres. It is a reviewed starting template, not a deployed environment. Paid instance sizes and Frankfurt are proposed defaults to confirm before provisioning. Database external access is disabled. Keep migration/owner credentials in operations; establish a restricted application database role before public launch. The owner performs reviewed migrations explicitly from a trusted Render shell, not from API startup or an automatic deploy hook. `/ready` must pass before traffic is enabled.

Set the **same** 64-character hexadecimal `ENCRYPTION_KEY` and canonical HTTPS `WEB_ORIGIN` on API and worker. Configure the email adapter on the worker. Use separate environments and keys for staging and production. No secrets use `NEXT_PUBLIC_` variables.

In Vercel, import the same repository as a Next.js project with Root Directory `apps/web`, Node 22, and access to workspace files outside that directory enabled. Use the shared root lockfile; set `API_BASE_URL` to the Render API HTTPS address and `SITE_URL` to the frontend's canonical HTTPS origin. Use isolated preview settings. The browser talks to same-origin Next.js Server Actions; the server calls Express with the HttpOnly session credential. No ad-hoc browser dashboard endpoints or localStorage tokens.

Provider references checked 24 October 2026: [Render Express deployment](https://render.com/docs/deploy-node-express-app), [Render Blueprint fields](https://render.com/docs/blueprint-spec), [Vercel monorepos](https://vercel.com/docs/monorepos).
