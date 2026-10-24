# Jobtrail

A MERN job application tracker with an enforced stage pipeline, automatic follow-up reminders, resume-to-job matching and funnel analytics.

**Live app:** _add your deployed URL_ · **API:** _add your Render URL_ · **Demo video:** _add link_

## Problem statement
Job seekers apply to dozens of roles across portals, referrals and recruiters. Statuses live in spreadsheets and memory, follow-ups get forgotten, and nobody knows which sources or resume versions actually work.

## Target users
Students and early-career professionals running an active job search.

## Solution
Jobtrail models each application as a workflow, not a row. Stage changes are validated by a state machine, every change is logged, reminders are created and cancelled automatically from those changes, and the log powers analytics.

## Key features
- **Register and login** with bcrypt-hashed passwords and JWT sessions; every query is scoped to the logged-in user.
- **Pipeline with a state machine:** Wishlist → Applied → Screening → Interview → Offer → Accepted, with Rejected and Withdrawn. Invalid jumps (for example Wishlist → Offer) are rejected by the API, and the board only allows valid drops. Rejected applications can be explicitly reopened.
- **Board and list views** with drag and drop, search, filters (stage, source) and sorting. Duplicate company and role entries trigger a warning.
- **Smart reminders:** Applied schedules a follow-up in 7 days, Interview a thank-you note in 1 day, Offer a decision reminder in 3 days. Reminders are superseded or cancelled as the application moves on or closes. A scheduled job emails due reminders; users can mark done, snooze, or add their own.
- **Resume match:** upload a PDF, paste a job description, get a deterministic skill-overlap score plus an AI review (strengths, gaps, suggested bullet edits) validated against a schema. Results are stored per application, so you can see how a resume revision changed the score.
- **Analytics:** funnel with step conversion, response and interview rates, average days per stage, applications per week, and source performance, built with MongoDB aggregation.

## Tech stack
MongoDB Atlas + Mongoose · Express · React (Vite) · Node.js · JWT + bcryptjs · node-cron · Nodemailer · Multer + pdf-parse · @hello-pangea/dnd · Anthropic Messages API (optional)

## Architecture
```
React SPA (Vite)  ──HTTPS/JSON──▶  Express API  ──▶  MongoDB Atlas
 AuthContext, Axios                 routes → controllers → services
 Board, Detail, Reminders,          middleware: auth, rate limit, upload, errors
 Resumes, Analytics                 services: stateMachine, reminderService,
                                              reminderJob (cron), matcher (+ LLM)
```
Collections: `users`, `applications`, `stageevents` (stage change log), `reminders`, `resumes`, `matchanalyses`.

Design decisions worth noting:
- **State machine on the server** is the source of truth; the client mirrors it only for UX. Moves use a compare-and-set on the previous stage, so concurrent requests cannot both win.
- **Reminder dedupe:** a partial unique index allows only one pending automatic reminder per application and type. The job claims reminders with an atomic `pending → sent` update, so a reminder never fires twice, and failed emails retry up to 3 times.
- **AI is wrapped, not trusted:** inputs are delimited as data, output is parsed and validated, results are cached by resume and job description hash, calls are rate limited per user (15/hour), and any failure falls back to the deterministic score.
- **Security:** helmet, CORS allow-list, login/register rate limiting, uniform login errors with constant-time-ish comparison, PDF magic-byte and size checks, regex input escaped for search, secrets only in environment variables.

## Local setup
Requirements: Node 18+, a MongoDB Atlas cluster (or local MongoDB).
```bash
git clone <your-repo-url> && cd jobtrail

# API
cd server
cp .env.example .env      # fill in MONGO_URI and JWT_SECRET at minimum
npm install
npm run dev               # http://localhost:5000

# Web (new terminal)
cd client
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```
Run the logic tests with `cd server && npm test`.

## Environment variables
**server/.env**
| Name | Required | Purpose |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random string for signing tokens |
| `CLIENT_URL` | yes | Allowed origin(s), comma separated |
| `PORT` | no | Defaults to 5000 |
| `EMAIL_USER`, `EMAIL_PASS` | no | Gmail address and app password for reminder emails; without them reminders still show in the app |
| `CRON_SECRET` | no | Protects `POST /api/cron/reminders` |
| `AI_API_KEY`, `AI_MODEL` | no | Enables the AI review; without it the keyword score is used |

**client/.env**: `VITE_API_URL` (for example `https://your-api.onrender.com/api`)

## Deployment
1. **Database:** create a free MongoDB Atlas cluster, allow network access (0.0.0.0/0 for a demo), copy the connection string.
2. **API on Render:** new Web Service from the repo, root directory `server`, build `npm install`, start `npm start`, add the server environment variables, and set `CLIENT_URL` to your Vercel URL.
3. **Web on Vercel:** import the repo, root directory `client`, framework Vite, set `VITE_API_URL`. `vercel.json` handles SPA routing.
4. **Reminders on a sleeping free instance:** the in-process scheduler only runs while the server is awake. Add a free external pinger (for example cron-job.org) that sends `POST https://your-api.onrender.com/api/cron/reminders` with header `x-cron-secret: <CRON_SECRET>` every 15 minutes.

## API overview
`POST /api/auth/register|login` · `GET /api/auth/me` · `GET|POST /api/applications` · `GET|PUT|DELETE /api/applications/:id` · `PATCH /api/applications/:id/stage` · `POST /api/applications/:id/match` · `GET|POST /api/reminders` · `PATCH /api/reminders/:id/done|snooze` · `GET|POST /api/resumes` · `DELETE /api/resumes/:id` · `GET /api/analytics` · `POST /api/cron/reminders`

## Limitations
Scanned or image-only PDFs are not supported. Analytics average days per stage count completed stays only. Tokens are stored in localStorage, which is acceptable for this scope but httpOnly cookies would be stronger for production.
