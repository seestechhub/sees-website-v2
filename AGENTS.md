# SEES Platform engineering notes

This folder is the new Society website monorepo. It is separate from `sees-tech-hub`, Testbench and the old `sees_website` checkout.

- Use TypeScript Express for the backend, Next.js for the frontend and Neon PostgreSQL. The current deployment target is Vercel for both applications; the former Render plan is superseded. The user explicitly chose Express, not FastAPI or Supabase.
- Keep page data loading and authorization on the server. Next.js pages call the API; client components are for interaction. Never move session credentials to localStorage.
- Define colour values only in `apps/web/src/app/tokens.css`; use semantic CSS variables elsewhere. Fonts are Oswald and Inter from the supplied SEES guide.
- Keep member and administrator identities separate. Verify roles in Express for every protected operation; client visibility is not authorization.
- Matric eligibility is format validation, not independent identity proof. Do not add excluded years or require an official student email.
- All migration SQL lives in `database/migrations/NNN_description.sql`. Migrations are forward-only. An operator runs reviewed migrations deliberately; do not apply them automatically at app startup/deploy. Isolated tests may migrate only the guarded local `sees_platform_test` database.
- Always type-check TypeScript changes and run relevant integration checks. Do not claim production checks from local results.
- Append a timestamped summary to `timeline-changes.md` when changing this project. Record deferred work in append-only, gitignored `todo.m.md`.
- Avoid new dependency installations when existing tools suffice. Never touch other projects' Docker containers or databases.
- Keep `BUILD_STATUS.md` honest about unimplemented PRD requirements, provider integrations and deployment state.
- Keep the public Header/Footer inside the `(site)` route group. Admin routes, including admin sign-in, use their own layout and must never inherit public website navigation or the public footer.

- Documentation policy: user tutorials, setup/handover guides, plans and future authored documents stay local under ignored docs/. Never commit or force-add them. Keep root README.md minimal (no tutorial); AGENTS.md and upstream license notices are permitted repository metadata. Existing documentation history is not erased by ignoring files.
- Cloudinary is the selected media provider. Keep its API secret backend-only; local handoff credentials belong in ignored apps/api/.env.cloudinary.
