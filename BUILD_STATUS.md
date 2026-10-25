# Initial build — 24 October 2026

This is the first working increment, not completion of the full PRD or approval to launch.

## Implemented

- Next.js website with the supplied brand colours, local Oswald/Inter fonts, responsive landing page, executive/subbody/event listings, journal and searchable resource library.
- TypeScript Express API and PostgreSQL schema. Data and authorization checks happen on the server.
- Exact matric allowlist; personal-email verification; matric/password login; single-use, expiring recovery links; reset/deactivation session revocation.
- Separate admin identities, Argon2id passwords, TOTP with replay protection, eight-hour sessions and thirty-minute inactivity expiry; editor/super-admin separation.
- Generic content editor with drafts, scheduling, archive, optimistic concurrency, stored revision snapshots and audit events; member status management and audited directory/log access.
- Member-only bodies and destination URLs excluded from anonymous responses. Level resources require member visibility.
- Independent double opt-in newsletter subscriptions, no-login unsubscribe and encrypted transactional outbox. Web publication never implicitly emails subscribers.
- Render and Vercel configuration, explicit migration/bootstrap scripts and isolated database integration tests.

## Remaining before a public launch

- Approved executive names/photos, President's address, subbody descriptions, resource inventory, contacts, privacy/retention policy, and imagery rights review. The engineering photo is an existing site asset, not claimed to depict SEES students.
- Actual email-provider adapter, authenticated sending domain, delivery callbacks, suppression/reconciliation, bounded retries and provider sandbox verification. Emails currently remain queued without configuration.
- Rich-text editing, preview, autosave, revision restore, content-type-specific forms, current executive session and structured site settings.
- Private media storage and expiring authorized downloads. The current resource implementation links to externally hosted files.
- Roster import, disputed identity resolution, academic-level assignment/promotion, member profile/email changes and deletion workflows.
- Admin invitations, MFA recovery, role/handover management; paginated directory/audit search with masking, export governance and a restricted application database role.
- Newsletter campaigns, send preview/confirmation, recipient eligibility, unsubscribe/suppression rechecks, pause/cancel and delivery reporting.
- Retention/cleanup jobs, distributed edge abuse controls, structured observability, security/accessibility/load checks and backup restoration rehearsal.
- Deployment accounts, secrets, domains and billing; actual Render/Vercel staging/production deployment. The user-supplied source repository is [seestechhub/sees-website-v2](https://github.com/seestechhub/sees-website-v2).

RADAR remains undecided. Huawei/Testbench is paused and separate.

## Verification record

TypeScript checks passed for both applications. The Express and Next.js 16.4.3 production builds passed. All 10 PostgreSQL-backed integration tests passed, covering matric eligibility, Lagos scheduling, verification/recovery, MFA and role separation, protected content, concurrent edits, scheduling, revocation, audit mutation rejection, newsletter consent and request limiting. The runtime dependency audit reports zero known vulnerabilities after the Next.js update. Browser checks passed for member sign-in, administrator MFA sign-in, draft creation, journal routing, and landing-page layouts at phone and desktop viewport sizes with no horizontal overflow. Synthetic browser accounts and the draft were removed. External mail delivery, Render provisioning and production deployment have not been tested.


The local preview is running at http://localhost:3108 against the disposable, memory-backed test database (port 5548). Its data is temporary. No worker or mail provider is running. Follow README.md for a persistent local database and real owner bootstrap. Screenshot: docs/preview-desktop.png.


Admin layout correction: public pages now live in the (site) route group. The admin sign-in and authenticated dashboard render zero public headers/footers; the homepage renders one of each. Verified in the browser after a successful production build and npx tsc --noEmit. The synthetic verification identities were removed. Evidence: docs/admin-layout-fixed.png.

