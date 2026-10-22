# EventHub Ticket Booking System

MERN app (React + Vite, Express, MongoDB/Mongoose) for browsing events and booking tickets.
Roles: **attendee**, **organizer**, **admin**.

```
itue301-exam-<roll>-<batch>/
├── backend/                Express API (node server.js)
│   ├── server.js           entry point: env check, DB connect, graceful shutdown
│   ├── .env / .env.example
│   └── src/
│       ├── app.js          middleware order: requestLogger -> cors -> json -> routes -> 404 -> errorHandler
│       ├── config/         db.js (Mongoose connect), logger.js
│       ├── models/         Attendee.js, Event.js, Ticket.js
│       ├── middleware/     requestLogger, authGuard (+authorize), notFound, errorHandler
│       ├── controllers/    auth, event, ticket
│       ├── routes/         /api/v1/auth, /events, /tickets, /health
│       ├── utils/          AppError, asyncHandler
│       └── seed.js         demo data
└── frontend/               React (Vite, JavaScript)
    ├── vite.config.js      dev proxy: /api -> http://localhost:5000
    └── src/
        ├── App.jsx         routes + React.lazy/Suspense for OrganizerPanel
        ├── context/        AuthContext  { attendee, token, role }
        ├── components/     EventCard, Navbar, ProtectedRoute, Loader, ErrorMessage, ErrorBoundary
        ├── pages/          LoginPage, EventsPage, MyTicketsPage, OrganizerPanel
        ├── services/api.js every fetch call lives here
        └── utils/          logger.js, authStorage.js
```

## Prerequisites

- Node.js 18+ (Vite 5 as pinned here works on Node 18+; the newest Vite needs Node 20.19+)
- MongoDB: local install **or** a free MongoDB Atlas cluster

## 1. MongoDB setup

**Local:** install MongoDB Community, start the service (`mongod`), and keep the default in `backend/.env`:
`MONGO_URI=mongodb://127.0.0.1:27017/eventhub`. The database and collections are created automatically.

**Atlas:** create a free cluster -> Database Access (create a user) -> Network Access (allow your IP) ->
Connect -> Drivers -> copy the string into `MONGO_URI` (replace `<user>`, `<password>`, and add `/eventhub` before the `?`).

## 2. Backend

```bash
cd backend
npm install
# .env is already included; edit MONGO_URI and JWT_SECRET if needed
npm run seed        # optional: demo users + events (WIPES the collections)
npm start           # or: node server.js        (dev with auto-reload: npm run dev)
```

API runs on `http://localhost:5000`. Check `http://localhost:5000/api/v1/health`.

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `PORT` | API port (default 5000) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | token signing / lifetime |
| `CLIENT_ORIGIN` | allowed frontend origin(s) for CORS, comma-separated |
| `LOG_LEVEL` | `error`, `warn`, `info`, `debug` |

Demo accounts after `npm run seed` (password for all: `Password@123`):

| Role | Email |
|---|---|
| attendee | attendee@eventhub.test |
| organizer | organizer@eventhub.test |
| admin | admin@eventhub.test |

## 3. Frontend

**Option A - use the included files (fastest):**

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

**Option B - start from a fresh Vite scaffold (JavaScript):**

```bash
npm create vite@latest frontend -- --template react      # choose "JavaScript" if asked
cd frontend
npm install react-router-dom
```
Then copy this project's `frontend/src/` (replace the generated one), `frontend/vite.config.js`
(it contains the `/api` proxy) and `frontend/.env` into it, and run `npm run dev`.

Start the backend first. In dev the browser calls `/api/v1/...` and Vite proxies it to the backend (no CORS setup needed).
For a production build set `VITE_API_URL` to the full API URL (e.g. `https://api.example.com/api/v1`) before `npm run build`.

## API (`/api/v1`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login` | public | Verify credentials, return JWT |
| POST | `/auth/register` | public | Create an attendee account (extra) |
| GET | `/events` | public | List all events |
| POST | `/events` | organizer/admin | Create event (Organizer Panel) |
| POST | `/tickets` | token | Book tickets (validates + decrements availability) |
| GET | `/tickets/my` | token | Own tickets, populated attendee + event |
| PATCH | `/tickets/:id/status` | token | Update status (see rules below) |
| GET | `/health` | public | Liveness + DB state |

**Status rules:** attendees may only *cancel their own* booked ticket. Organizer/admin may mark any booked ticket
`used` or `cancelled`. `cancelled` and `used` are final. Cancelling returns the tickets to the event.

### Try it (curl / Postman / Thunder Client)

```bash
# 1. Login -> copy data.token
curl -s -X POST localhost:5000/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"attendee@eventhub.test","password":"Password@123"}'

# 2. Events -> copy an event _id
curl -s localhost:5000/api/v1/events

# 3. Book
curl -s -X POST localhost:5000/api/v1/tickets -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" -d '{"eventId":"<EVENT_ID>","quantity":2}'

# 4. My tickets
curl -s localhost:5000/api/v1/tickets/my -H "Authorization: Bearer <TOKEN>"
```

### Validation-failure demo (required by Task 5)

Ask for more tickets than exist (the seeded "Stand-up Comedy Evening" has 5):

```bash
curl -s -X POST localhost:5000/api/v1/tickets -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" -d '{"eventId":"<COMEDY_EVENT_ID>","quantity":50}'
```
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_TICKETS",
    "message": "Only 5 ticket(s) left, but you requested 50",
    "details": { "requested": 50, "available": 5 }
  },
  "requestId": "..."
}
```
HTTP status is `400`. Other demos: `quantity: 0` -> 400 `VALIDATION_ERROR`; no token -> 401 `TOKEN_MISSING`;
booking "Classical Dance Recital" -> 400 "This event is sold out"; schema errors on `POST /events` return a `details` array per field.

## Error handling

Every failure returns the same shape, never a raw stack trace:

```json
{ "success": false, "error": { "code": "...", "message": "...", "details": [...] }, "requestId": "..." }
```

| Status | When |
|---|---|
| 200 / 201 | success / created |
| 400 | validation error, bad id, insufficient tickets, invalid JSON |
| 401 | missing, invalid or expired token; bad login |
| 403 | logged in but not allowed (role / not your ticket) |
| 404 | unknown route, event or ticket |
| 409 | duplicate email; invalid status change |
| 500 | unexpected error (message is generic; details are in the logs) |

Mongoose `ValidationError`, `CastError`, duplicate-key (`11000`), JWT and JSON-parse errors are all translated in `middleware/errorHandler.js`.

## Logging and debugging

**Backend** (`src/config/logger.js`)
- Console + files: `backend/logs/app.log` (everything) and `backend/logs/error.log` (errors only), one JSON object per line.
- `requestLogger` prints `[METHOD] [PATH] [TIMESTAMP]` for every request, then `METHOD PATH -> STATUS (ms)` when it finishes.
- Every request gets a **requestId** (also sent back as the `X-Request-Id` header and in every error JSON).
  When something fails in the browser, copy the *Reference* shown in the red error box and search the log:
  `grep "<requestId>" backend/logs/app.log`
- Set `LOG_LEVEL=debug|info|warn|error`. Passwords, tokens and request-body values are never logged (only body key names).
- Logs are not rotated automatically; delete the `logs/` folder or use `logrotate`/`pm2` for long-running servers.

**Frontend** (`src/utils/logger.js`, `src/services/api.js`)
- Every API call logs method, path, status and duration in the browser console (`VITE_LOG_LEVEL=debug`).
- Run `__eventhubLogs()` in the console to dump the last 200 log entries.
- `ErrorBoundary` + global `error`/`unhandledrejection` listeners log crashes instead of showing a blank page.
- A 401 on a token-bearing request logs the user out automatically (expired session).

**Common problems**

| Symptom | Fix |
|---|---|
| `Could not connect to MongoDB` | start `mongod`, or check `MONGO_URI` / Atlas IP allow-list |
| "Cannot reach the server" in the UI | backend not running, or wrong `PORT`/`VITE_PROXY_TARGET` |
| CORS error | set `CLIENT_ORIGIN` in `backend/.env` to the exact frontend URL and restart |
| `Port 5000 is already in use` | change `PORT` in `backend/.env` and `VITE_PROXY_TARGET` in `frontend/.env` |

## Requirement checklist

| Requirement | Where |
|---|---|
| 3+ pages (Login, Events, MyTickets) | `frontend/src/pages/` |
| Protected routes + role check | `components/ProtectedRoute.jsx` (no token -> `/`, wrong role -> `/events`) |
| Reusable `EventCard` with props, Sold Out badge | `components/EventCard.jsx` |
| Global auth state | `context/AuthContext.jsx` (`{ attendee, token, role }`) |
| Navigation without reload | `components/Navbar.jsx` (`NavLink`) |
| Booking form with state | `pages/EventsPage.jsx` (`selectedEventId`, `quantity`) |
| Lazy Organizer Panel | `App.jsx` (`React.lazy` + `Suspense`), `pages/OrganizerPanel.jsx` |
| fetch + loading/error/events + `useEffect` + search | `pages/EventsPage.jsx`, `services/api.js` |
| 5+ REST endpoints under `/api/v1/` | `backend/src/routes/` |
| `requestLogger` global, `authGuard` on protected routes | `src/app.js`, `middleware/`, `routes/ticketRoutes.js` |
| Global error middleware (last) | `middleware/errorHandler.js` |
| Mongoose schemas with required/enum/min | `backend/src/models/` |
| Availability check, decrement, populate | `controllers/ticketController.js` |
| `.env` + `.env.example`, README | `backend/`, `frontend/`, root |

Notes for viva:
- Availability is checked with `findById` (friendly message), then decremented with an atomic
  `findOneAndUpdate({ ticketsAvailable: { $gte: quantity } }, { $inc: ... })`, so the count can never go negative even with
  simultaneous bookings. If `Ticket.create` fails, the decrement is reversed.
- `Attendee` has two extra fields beyond the spec, `password` (bcrypt-hashed, `select: false`) and `role`, which login and role checks need.
  Public sign-up always creates `attendee`; roles can only be set via the seed script / database.
- The Organizer Panel accepts **organizer and admin** roles (change `roles` in `App.jsx` to `['organizer']` for organizer-only).
- The Organizer nav link is shown to everyone on purpose; `ProtectedRoute` is what enforces access.

## Submitting to GitHub

```bash
git init
git add .                       # .gitignore keeps backend/.env, node_modules and logs out
git commit -m "EventHub ticket booking system"
git branch -M main
git remote add origin https://github.com/<username>/itue301-exam-<roll>-<batch>.git   # e.g. itue301-exam-24it045-A
git push -u origin main
```
The repository must be **public** and named exactly `itue301-exam-[roll-number]-[batch]`.
Before pushing, check `git status` - the real `.env` must not appear; `.env.example` files must.
