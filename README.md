# LeadDesk Mini-CRM

> **Full-Stack Lead & Customer Inquiry Management Platform**  
> Built for Social Bano Technologies Technical Assessment (Section E).

[![NestJS](https://img.shields.io/badge/Backend-NestJS%20v11-ea2845?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/Frontend-React%20v19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%20v5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-4169e1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Queue-Redis%207%20%2B%20BullMQ-dc382d?logo=redis&logoColor=white)](https://redis.io/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS%20v4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ed?logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-73%20Passing-brightgreen?logo=vitest&logoColor=white)](https://vitest.dev/)

---

## 1. Executive Summary

**LeadDesk Mini-CRM** is a production-grade multi-tenant lead capture and pipeline management platform designed specifically for Social Bano Technologies' business clients (such as dental clinics, educational institutions, and local retail stores).

The system automates the complete lead lifecycle:
1. **Public Customer Capture:** Prospects submit inquiries via a responsive public portal with dynamic services, INR (₹) budget estimators, and invisible anti-spam honeypot defenses.
2. **Deterministic Quality Scoring:** Every lead is scored on a multi-factor 0–100 scale evaluating pipeline status, response velocity, lead channel, budget magnitude, and service tier.
3. **Stateless Auto-Assignment:** Incoming leads are instantly routed to the sales executive with the fewest active deals using a self-balancing "Least Open Leads" algorithm.
4. **24-Hour Overdue Automation:** BullMQ + Redis background workers run repeatable checks to detect uncontacted inquiries older than 24 hours, flagging them as overdue and notifying team members.
5. **Multi-Role Scoped Access:** Super Admins, Sales Executives, and Client Portal representatives operate within strictly isolated permission boundaries.

---

## 2. Key Architecture & Design Decisions

### A. Database Integrity & Strict Migrations
- **TypeORM with `synchronize: false`:** Auto-synchronization is strictly disabled in all environments to prevent accidental schema corruption. All structural changes are tracked via versioned SQL migrations in `api/src/database/migrations/`.
- **Composite Indexes & Search:** Composite indexes (`[client, status]`, `[assignedTo, status]`, `[isOverdue, status]`) ensure low-latency dashboard queries under load. Trigram GIN indexes (`pg_trgm`) power fuzzy prospect name searches.

### B. Enterprise Authentication & Security
- **Bcrypt Passwords:** Passwords are salted and hashed using 10 rounds of `bcrypt`.
- **SHA-256 JWT Refresh Token Rotation:** Refresh tokens are hashed via `crypto.createHash('sha256')` before database storage. Unlike bcrypt (which truncates at 72 bytes), SHA-256 supports arbitrary token lengths without header collisions. Single-use rotation detects and revokes reused tokens immediately.
- **Single In-Flight Refresh Queue:** The frontend Axios client coordinates simultaneous 401 retries using a shared refresh promise, preventing race conditions or token invalidation storms.
- **Network Rate Limiting:** Global `@nestjs/throttler` protects endpoints. Public inquiry creation is rate-limited to 5 requests/minute per IP with `app.set('trust proxy', 1)` to prevent `X-Forwarded-For` header spoofing behind Docker/Nginx proxies.
- **Anti-Enumeration Protection:** If a Sales Executive attempts to query an unassigned lead ID, the API returns `404 Not Found` (rather than `403 Forbidden`) to prevent enumeration attacks.

### C. Lead Quality Scoring Algorithm (0–100 Points)
The multi-factor scoring engine calculates lead quality deterministically across 5 independent dimensions:

$$\text{Total Score} = \min(100, \text{Status} + \text{Contact Speed} + \text{Source} + \text{Budget} + \text{Service Tier})$$

| Factor | Criteria | Raw Points | Notes |
|---|---|:---:|---|
| **Pipeline Status** | `WON`<br>`PROPOSAL_SENT`<br>`CONTACTED`<br>`NEW`<br>`LOST` | **+30**<br>**+25**<br>**+15**<br>**+5**<br>**+0** | Reflects pipeline progression. |
| **Contact Velocity** | Contacted $\le 1$ hour<br>Contacted $1 - 4$ hours<br>Contacted $4 - 24$ hours<br>Contacted $> 24$ hours<br>Uncontacted (`NEW`) | **+20**<br>**+15**<br>**+10**<br>**+0**<br>**+0** | **Uncontacted leads strictly receive 0 points.** Points unlock once first contact is logged. |
| **Lead Source** | `REFERRAL`<br>`GOOGLE_ADS`<br>`WEBSITE`<br>`FACEBOOK`<br>`OTHER` | **+20**<br>**+15**<br>**+10**<br>**+10**<br>**+5** | High-intent channels earn top weight. |
| **Budget Magnitude (₹)** | $\ge ₹1,00,000$<br>$₹50,000 - ₹99,999$<br>$₹25,000 - ₹49,999$<br>$₹10,000 - ₹24,999$<br>$< ₹10,000$ | **+20**<br>**+15**<br>**+10**<br>**+5**<br>**+0** | Scaled for typical clinic, college, and shop contract values. |
| **Service Tier** | Premium / Comprehensive<br>Standard / Treatment<br>Basic / Checkup | **+10**<br>**+5**<br>**+0** | Differentiates high-margin services. |

---

## 3. Quick Start with Docker (Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+) with Docker Compose enabled.
- Git.

### 1. Clone & Setup Environment
```bash
git clone https://github.com/Maha-Belgouthi/leaddesk-mini-crm.git
cd leaddesk-mini-crm
cp .env.example .env
```

### 2. Launch All Services
```bash
docker compose up --build -d
```
Docker will build and orchestrate 4 isolated containers:
1. `leaddesk-postgres` (PostgreSQL 16 on `:5432` with healthcheck)
2. `leaddesk-redis` (Redis 7 on `:6379` with healthcheck)
3. `leaddesk-api` (NestJS REST API on `:4000` with Swagger)
4. `leaddesk-web` (React 19 + Nginx on `:3000`)

### 3. Seed Demo Data
Once the containers are running, populate the database with clients, users, and 50 diverse leads:
```bash
docker compose exec api npm run seed
```

---

## 4. Application URLs & Ports

| Service | URL | Description |
|---|---|---|
| **Web Frontend** | `http://localhost:3000` | Full CRM Dashboard, Pipeline View, Public Portal |
| **REST API Gateway** | `http://localhost:4000/api` | NestJS Application API |
| **Swagger OpenAPI Docs** | `http://localhost:4000/api/docs` | Interactive Swagger API Explorer |
| **PostgreSQL Database** | `localhost:5432` | DB Name: `leaddesk_db` (User: `postgres`) |
| **Redis Queue** | `localhost:6379` | BullMQ background jobs store |

---

## 5. Demo Accounts & Credentials

The database seeder provisions 4 role-scoped test accounts:

| Role | Email | Password | Scoped Permissions |
|---|---|---|---|
| **Super Admin** | `admin@leaddesk.local` | `Admin@123456` | Global access across all clients, lead reassignment, full user management, internal notes. |
| **Sales Rep 1** | `sales1@leaddesk.local` | `Sales@123456` | Manages assigned leads for Apex Dental & Apex Institute, status advancement, internal notes. |
| **Sales Rep 2** | `sales2@leaddesk.local` | `Sales@123456` | Manages assigned leads for QuickFix Auto & Apex Dental, status advancement, internal notes. |
| **Client Portal** | `client@apex.local` | `Client@123456` | Read-only view for Apex Dental Care. **Internal notes are securely hidden.** |

> **Tip:** The web login page includes **1-Click Quick Login buttons** for each role so you can switch personas instantly without typing credentials!

---

## 6. Automated Testing Suite

The repository includes comprehensive unit and end-to-end (E2E) testing suites (**73 total passing tests**):

```
┌────────────────────────────────────────────────────────────┐
│                    TEST SUITE SUMMARY                      │
├────────────────────────────┬─────────────┬─────────────────┤
│ Test Suite                 │ Test Type   │ Status          │
├────────────────────────────┼─────────────┼─────────────────┤
│ ScoringService (28 tests)  │ Unit Test   │ ✓ 28/28 Passed  │
│ LeadsService (14 tests)    │ Unit Test   │ ✓ 14/14 Passed  │
│ AuthService (10 tests)     │ Unit Test   │ ✓ 10/10 Passed  │
│ NotesService (6 tests)     │ Unit Test   │ ✓ 6/6 Passed    │
│ OverdueProcessor (3 tests) │ Unit Test   │ ✓ 3/3 Passed    │
│ AppController (1 test)     │ Unit Test   │ ✓ 1/1 Passed    │
│ PublicLeadsE2E (4 tests)   │ Supertest   │ ✓ 4/4 Passed    │
│ AuthFlowE2E (6 tests)      │ Supertest   │ ✓ 6/6 Passed    │
│ AppE2E (1 test)            │ Supertest   │ ✓ 1/1 Passed    │
├────────────────────────────┼─────────────┼─────────────────┤
│ TOTAL AUTOMATED TESTS      │ Unit + E2E  │ ✓ 73/73 PASSED  │
└────────────────────────────┴─────────────┴─────────────────┘
```

### Running Tests Locally
```bash
# Run 62 Unit Tests
cd api
npm test

# Run 11 Supertest E2E Tests (requires Postgres & Redis running)
npm run test:e2e

# Build and type-check the Frontend
cd ../web
npm run build
```

---

## 7. Native Local Development (Without Docker)

If you prefer to run services natively on your host machine:

### 1. Start Postgres & Redis
```bash
docker compose up -d postgres redis
```

### 2. Configure Backend
```bash
cd api
npm install
npm run migration:run
npm run seed
npm run start:dev
```
API will listen on `http://localhost:4000/api` (Swagger on `/api/docs`).

### 3. Configure Frontend
```bash
cd ../web
npm install
npm run dev
```
Vite dev server will listen on `http://localhost:3000`.

---

## 8. Repository Layout

```
leaddesk-mini-crm/
├── docker-compose.yml          # Production multi-service orchestration
├── .env.example                # Canonical environment template
├── README.md                   # Technical documentation and architecture guide
├── api/                        # NestJS Backend Application
│   ├── Dockerfile              # Multi-stage production container build
│   ├── src/
│   │   ├── config/             # Database, Redis, and JWT configurations
│   │   ├── database/           # TypeORM migrations, data-source, and seeder
│   │   ├── common/             # Roles/Public decorators, JWT and role guards
│   │   └── modules/
│   │       ├── auth/           # Login, SHA-256 refresh rotation, logout
│   │       ├── leads/          # Pipeline state machine, scoring, auto-assign
│   │       ├── notes/          # Notes timeline with internal privacy filter
│   │       ├── activity/       # Audit logging for lead changes
│   │       ├── notifications/  # Unread count badge and user notifications
│   │       ├── jobs/           # BullMQ 24h overdue background processor
│   │       └── users/          # User management and role assignment
│   └── test/                   # Supertest E2E integration test suites
└── web/                        # React 19 + TypeScript + TailwindCSS Frontend
    ├── Dockerfile              # Multi-stage build served via Nginx
    ├── nginx.conf              # Production reverse proxy and SPA routing
    └── src/
        ├── api/                # Axios client with single in-flight JWT refresh
        ├── context/            # AuthContext with session restoration
        ├── components/         # Header, LeadDetailModal, NotificationsDrawer
        ├── pages/              # LoginPage, LeadsBoard, PublicInquiryPage
        └── types/              # Shared domain models and enums
```

---

## 9. License

This project was developed for the **Social Bano Technologies Technical Assessment** and is licensed under the MIT License.
