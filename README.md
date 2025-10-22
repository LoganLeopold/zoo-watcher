# Zoo Aid/Aide Monitor — Render Cron Job (Node)

Scans https://nationalzoo.si.edu/support/volunteer/washington-dc for “zoo aid” / “zoo aide” and emails you if there are hits.

- Runtime: **Node 18+**
- Email: **SMTP** via Nodemailer (works with Gmail or iCloud `@me.com` using an *app-specific password*)
- Schedule: **hourly** (UTC) via Render **Cron Jobs**
- Infra-as-code: `render.yaml` Blueprint

## Local development
1. Copy `.env.example` to `.env` and fill in values.
2. Install + run:
   ```bash
   npm install
   node index.js
   ```

## Deploy to Render (Blueprint)
1. Push this repo to GitHub.
2. In Render, create a **Blueprint** from your `render.yaml`.
3. During first deploy, Render will prompt you to enter values for the env vars (we mark them `sync: false` so they’re not stored in git).
4. The cron job will run `node index.js` on the schedule in `render.yaml` (default: top of each hour, UTC).

## Environment variables
- `SMTP_HOST` — e.g. `smtp.mail.me.com` (iCloud) or `smtp.gmail.com` (Gmail)
- `SMTP_PORT` — typically `587`
- `SMTP_USER` — your sender address (Gmail/iCloud email)
- `SMTP_PASS` — **App-specific password** (Gmail App Password or Apple app-specific password)
- `EMAIL_FROM` — optional; defaults to `SMTP_USER`
- `EMAIL_TO` — recipient (your `@me.com` address)
- `ONLY_EMAIL_ON_CHANGE` — optional (`true`/`false`), email only when presence changes

## Notes
- Cron timezone is **UTC** on Render. For hourly, `0 * * * *` is fine. To run at 5 past each hour, use `5 * * * *`.
- The script stores a tiny state file `.state/zoo_aid.sig` to suppress repeat emails when `ONLY_EMAIL_ON_CHANGE=true`.
