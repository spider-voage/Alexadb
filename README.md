# SpiderDB

A cloud database platform built with plain Node.js, Express, and vanilla HTML/CSS/JS. No build step. No bundler. Just works.

## What it is

SpiderDB lets you spin up managed PostgreSQL and MySQL databases in seconds. It includes a full landing page, authentication, a dashboard for managing databases and API keys, and a REST API — all built with minimal dependencies.

## Tech Stack

- **Backend**: Node.js + Express + SQLite
- **Frontend**: Vanilla HTML/CSS/JS (no framework, no build step)
- **Auth**: JWT tokens (jsonwebtoken) + bcryptjs
- **Database**: SQLite (file-based, zero-config)

## Quick Start

```bash
npm install
npm start
```

Then open http://localhost:3000

## Project Structure

```
spiderdb/
├── server.js              # Express server, API routes
├── db.js                  # SQLite database module
├── package.json
├── public/
│   ├── index.html         # Landing page
│   ├── login.html         # Sign in
│   ├── register.html      # Sign up
│   ├── dashboard.html     # App dashboard
│   ├── css/
│   │   └── style.css      # All styles (no framework)
│   └── js/
│       ├── app.js         # Landing page interactions
│       ├── auth.js        # Shared auth utilities
│       └── dashboard.js   # Dashboard logic
```

## Features

- **Landing page** with hero, features grid, pricing, docs section, and footer
- **Dark/light mode** toggle with localStorage persistence
- **Authentication** — register, login, JWT sessions
- **Dashboard** — create/view/delete databases, view logs, manage API keys
- **Database provisioning** — simulated status pipeline (pending → building → live)
- **API keys** — create and revoke scoped keys
- **Responsive design** — works on mobile, tablet, desktop
- **Zero build step** — edit HTML/CSS/JS directly and refresh

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/databases` | Yes | List databases |
| POST | `/api/databases` | Yes | Create database |
| GET | `/api/databases/:id` | Yes | Get database |
| DELETE | `/api/databases/:id` | Yes | Delete database |
| GET | `/api/databases/:id/logs` | Yes | Database logs |
| GET | `/api/api-keys` | Yes | List API keys |
| POST | `/api/api-keys` | Yes | Create API key |
| DELETE | `/api/api-keys/:id` | Yes | Revoke API key |
| GET | `/api/analytics/:id` | Yes | Database analytics |

## Deployment

### Render / Railway / VPS

```bash
git push
# Set environment variables:
#   PORT=3000
#   JWT_SECRET=your-secret-key
#   NODE_ENV=production
```

### Local Development

```bash
npm install
npm start
# Edit files in public/ and refresh the browser
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | `spiderdb-dev-secret-change-in-production` | JWT signing key |
| `DB_PATH` | `./spiderdb.sqlite` | SQLite database file path |

## License

MIT
