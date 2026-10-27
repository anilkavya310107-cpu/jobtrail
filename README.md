# Jobtrail

A MERN job application tracker with an enforced stage pipeline, automatic follow-up reminders, resume-to-job matching and conversion analytics.

| | |
|---|---|
| **Student** | Kavya Sharma |
| **Live app** | https://splendorous-semolina-2e7c28.netlify.app |
| **API** | https://jobtrail-d7po.onrender.com (health check: `/api/health`) |
| **Repository** | https://github.com/anilkavya310107-cpu/jobtrail |
| **Demo video** | See [Demo Video](#demo-video) at the end of this file |

> The API runs on a free Render instance that sleeps after inactivity. The first request after a quiet period can take 30 to 60 seconds. Open the health check link first if the app seems slow.

## Problem statement

Job seekers apply to dozens of roles across portals, referrals and recruiters. Statuses live in spreadsheets and memory, follow-ups get forgotten, and nobody knows which sources or resume versions actually lead to interviews.

## Target users

Students and early-career professionals running an active job search.

## Solution

Jobtrail models each application as a workflow rather than a row in a table. Stage changes are validated by a state machine, every change is logged, reminders are created and cancelled automatically from those changes, and the same log powers the analytics.

## Key features

- **Register and login** with bcrypt-hashed passwords and JWT sessions. Every query is scoped to the logged-in user, so one user can never read or edit another user's data.
- **Pipeline with a state machine:** Wishlist, Applied, Screening, Interview, Offer, Accepted, plus Rejected and Withdrawn. The API rejects invalid jumps such as Wishlist to Offer, and the board only allows valid drops. A rejected application can be explicitly reopened.
- **Board and list views** with drag and drop, search, filters (stage, source) and sorting. Adding the same company and role twice shows a duplicate warning.
- **Smart reminders:** moving to Applied schedules a follow-up in 7 days, Interview schedules a thank-you note for the next day, and Offer schedules a decision reminder in 3 days. Reminders are superseded or cancelled as the application moves on or closes. A scheduled job emails due reminders. Users can mark them done, snooze them, or add their own.
- **Resume match:** upload a PDF resume, paste a job description, and get a skill-overlap score with matched and missing skills. If an AI key is configured, the score is combined with an AI review (strengths, gaps, suggested resume edits). Every analysis is stored per application, so the history shows how a revised resume changed the score.
- **Analytics:** funnel with step-to-step conversion, response, interview and offer rates, average days per stage, applications added per week, and interview rate by source, built with MongoDB aggregation.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Axios, @hello-pangea/dnd |
| Backend | Node.js, Express |
| Database | MongoDB Atlas with Mongoose |
| Auth | JWT, bcryptjs |
| Jobs and email | node-cron, Nodemailer |
| Files | Multer, pdf-parse |
| AI (optional) | Anthropic Messages API |
| Hosting | Netlify (frontend), Render (API), MongoDB Atlas (database) |

## Architecture

```
React SPA (Vite)  --HTTPS/JSON-->  Express API  -->  MongoDB Atlas
 AuthContext, Axios                 routes -> controllers -> services
 Board, Detail, Reminders,          middleware: auth, rate limiting,
 Resumes, Analytics                   upload, error handling
                                    services: stateMachine, reminderService,
                                      reminderJob (cron), matcher (+ AI)
```

**Collections:** `users`, `applications`, `stageevents` (log of every stage change), `reminders`, `resumes`, `matchanalyses`.

**Design decisions**

- **The server owns the state machine.** The client mirrors it only for a better experience. Moves use a compare-and-set on the previous stage, so two concurrent requests cannot both succeed.
- **Reminders never fire twice.** A partial unique index allows one pending automatic reminder per application and type, and the job claims each reminder with an atomic `pending` to `sent` update. Failed emails retry up to three times.
- **AI is wrapped, not trusted.** Inputs are delimited as data, the output is parsed and validated against an expected shape, identical resume and job description pairs are cached by hash, calls are rate limited per user (15 per hour), and any failure falls back to the deterministic keyword score.
- **Security basics:** helmet, a CORS allow-list, rate limiting on login and register, identical error messages for unknown email and wrong password, PDF type, signature and size checks, escaped search input, and secrets only in environment variables.

## Project structure

```
jobtrail/
  client/                React app
    src/api/             Axios instance
    src/context/         Auth and toast providers
    src/components/      Layout, forms, shared UI, match panel
    src/pages/           Login, Register, Board, ApplicationDetail,
                         Reminders, Resumes, Analytics
  server/
    src/models/          Mongoose models
    src/controllers/     Request handlers
    src/routes/          Express routers
    src/middleware/      auth, upload, errors, id validation
    src/services/        stateMachine, reminders, matcher, mailer
    tests/               Logic tests (node --test)
```

## Local setup

Requirements: Node 18 or newer and a MongoDB connection string (Atlas free tier or local).

```bash
git clone https://github.com/anilkavya310107-cpu/jobtrail.git
cd jobtrail

# API
cd server
cp .env.example .env      # on Windows PowerShell: copy .env.example .env
npm install
npm run dev               # http://localhost:5000

# Web (second terminal)
cd client
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

Run the logic tests with `cd server && npm test`.

## Environment variables

**`server/.env`**

| Name | Required | Purpose |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Long random string used to sign tokens |
| `CLIENT_URL` | Yes | Allowed frontend origin(s), comma separated, no trailing slash |
| `PORT` | No | Defaults to 5000 (Render sets it automatically) |
| `NODE_ENV` | No | Use `production` when deployed |
| `EMAIL_USER`, `EMAIL_PASS` | No | Gmail address and app password for reminder emails. Without them, reminders still appear in the app |
| `CRON_SECRET` | No | Protects `POST /api/cron/reminders` |
| `AI_API_KEY`, `AI_MODEL` | No | Enables the AI review. Without a key, the keyword score is used |

**`client/.env`**

| Name | Purpose |
|---|---|
| `VITE_API_URL` | API base URL, for example `http://localhost:5000/api` |

No secrets are committed. `.env` files are listed in `.gitignore`, and only `.env.example` files are tracked.

## Deployment

1. **Database:** MongoDB Atlas free cluster, with network access set to allow Render.
2. **API on Render:** web service from this repo, root directory `server`, build command `npm install`, start command `npm start`, with the server environment variables set and `CLIENT_URL` set to the frontend URL.
3. **Frontend on Netlify:** base directory `client`, build command `npm run build`, publish directory `client/dist`, and `VITE_API_URL` set to the Render API address ending in `/api`. `client/public/_redirects` handles single-page-app routing.
4. **Reminders on a sleeping free instance:** the in-process scheduler runs only while the server is awake. An external scheduler can trigger it by sending `POST /api/cron/reminders` with the header `x-cron-secret: <CRON_SECRET>` every 15 minutes.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Applications | `GET, POST /api/applications` and `GET, PUT, DELETE /api/applications/:id` |
| Pipeline | `PATCH /api/applications/:id/stage` |
| Resume match | `POST /api/applications/:id/match` |
| Reminders | `GET, POST /api/reminders`, `PATCH /api/reminders/:id/done`, `PATCH /api/reminders/:id/snooze` |
| Resumes | `GET, POST /api/resumes`, `DELETE /api/resumes/:id` |
| Analytics | `GET /api/analytics` |
| Scheduler | `POST /api/cron/reminders` (secret header required) |

## Error handling

Invalid input returns clear messages, an invalid stage jump returns `400` with the allowed moves, resources owned by someone else return `404`, duplicates return `409` with a warning, uploads reject non-PDF, oversized, corrupt and image-only files, AI failures fall back to the keyword score, and the frontend shows loading, empty and error states with retry actions.

## Limitations

- Scanned or image-only PDFs are not supported because the resume text must be readable.
- Average days per stage counts completed stays only.
- Tokens are stored in `localStorage`, which is acceptable for this scope. httpOnly cookies would be stronger for production.
- The keyword matcher uses a built-in skill dictionary of about 90 common tech skills.

## Demo video

**Watch the demo (about 3 to 5 minutes):**

**Video link:** `PASTE YOUR VIDEO LINK HERE`

<!-- Optional: embed a clickable thumbnail that opens the video.
[![Jobtrail demo](PASTE_THUMBNAIL_IMAGE_URL_HERE)](PASTE_YOUR_VIDEO_LINK_HERE)
-->

<!-- Optional: to play the video directly inside this README on GitHub, edit this file in the
GitHub web editor and drag your .mp4 (under 100 MB) into the editor. GitHub inserts a link
that renders as an inline player. Put it on its own line below this comment. -->

**What the demo covers**

1. The problem and who the product is for
2. Registering and logging in
3. Adding applications and moving them across the board, including a blocked invalid move
4. The automatic reminder created when an application moves to Applied
5. Resume upload and the resume-to-job match with history
6. The analytics dashboard
