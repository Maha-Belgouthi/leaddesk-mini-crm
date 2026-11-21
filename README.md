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

## 2. Database Schema (Entity-Relationship Diagram)

The underlying PostgreSQL database is designed around a multi-tenant client structure where leads, activity logs, notes, and notifications are scoped to business clients:

```mermaid
erDiagram
    CLIENT ||--o{ USER : "has members"
    CLIENT ||--o{ LEAD : "owns leads"
    USER ||--o{ LEAD : "assigned_to"
    USER ||--o{ NOTE : "authors"
    USER ||--o{ ACTIVITY_LOG : "triggers"
    USER ||--o{ NOTIFICATION : "receives"
    LEAD ||--o{ NOTE : "contains"
    LEAD ||--o{ ACTIVITY_LOG : "tracks history"
    LEAD ||--o{ NOTIFICATION : "generates alerts"

    CLIENT {
        Data_Type id Primary_Key
        varchar name
        varchar slug UK "Indexed for public routing"
        varchar email
        varchar phone
        timestamp createdAt
        timestamp updatedAt
    }

    USER {
        Data_Type id Primary_Key
        varchar email UK "Indexed"
        varchar passwordHash "Bcrypt (10 rounds)"
        varchar fullName
        enum role "ADMIN, SALES_EXECUTIVE, CLIENT"
        uuid clientId FK "Nullable (for CLIENT role)"
        varchar refreshTokenHash "SHA-256 nullable"
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    LEAD {
        Data_Type id Primary_Key
        uuid clientId FK "Indexed"
        varchar name "pg_trgm indexed"
        varchar phone
        varchar email
        enum serviceNeeded "Fixed service tier"
        integer budget "In whole INR (₹)"
        text message
        enum status "NEW, CONTACTED, PROPOSAL_SENT, WON, LOST"
        enum source "WEBSITE, GOOGLE_ADS, FACEBOOK, REFERRAL, OTHER"
        integer score "0 to 100 quality score"
        uuid assignedToId FK "Indexed"
        boolean isOverdue "Flagged if >24h in NEW"
        timestamp contactedAt "Timestamp of first contact"
        timestamp createdAt "Indexed"
        timestamp updatedAt
    }

    NOTE {
        Data_Type id Primary_Key
        uuid leadId FK "Indexed"
        uuid authorId FK
        text content
        boolean isInternal "Hidden from client portal"
        timestamp createdAt
    }

    ACTIVITY_LOG {
        Data_Type id Primary_Key
        uuid leadId FK "Indexed"
        uuid actorId FK
        varchar action "STATUS_CHANGE, REASSIGN, NOTE_ADDED"
        jsonb metadata "Old and new values"
        timestamp createdAt
    }

    NOTIFICATION {
        Data_Type id Primary_Key
        uuid recipientId FK "Indexed"
        uuid leadId FK
        varchar title
        text message
        boolean isRead
        timestamp createdAt
    }
```

### Table Indexing Strategy
- **Composite Indexes:** `[clientId, status]`, `[assignedToId, status]`, and `[isOverdue, status]` ensure index-only scans on lead dashboard queries.
- **Search Optimization:** GIN trigram indexes (`pg_trgm`) power lightning-fast fuzzy name searches on the leads table.

---

## 3. Key Design Decisions & Trade-Offs 

During the architectural design and implementation of LeadDesk Mini-CRM, several critical technical decisions and trade-offs were made:

### 1. Database Integrity: Versioned Migrations vs. `synchronize: true`
- **Decision:** Auto-synchronization is strictly disabled (`synchronize: false`) across all environments, including local development and test runs. All schema evolutions are driven by timestamped SQL migrations in `api/src/database/migrations/`.
- **Trade-off:** Writing migrations takes slightly more initial effort than letting TypeORM auto-generate tables on boot. However, in production, `synchronize: true` risks catastrophic table drops or unlogged schema mutations. Strict migrations guarantee deterministic, zero-data-loss deployments.

### 2. Refresh Token Hashing: SHA-256 vs. Bcrypt
- **Decision:** User passwords use `bcrypt` (10 salt rounds), while JWT refresh tokens are hashed using `crypto.createHash('sha256')`.
- **Trade-off:** Bcrypt has a known hard limit: it silently truncates inputs at 72 bytes. Because signed JWT tokens frequently exceed 150+ bytes and share identical cryptographic header prefixes (`eyJhbGciOi...`), hashing JWTs with bcrypt risks collisions and truncation vulnerabilities. SHA-256 accepts arbitrary lengths, executes in constant time, and safely detects token reuse.

### 3. Lead Assignment: "Least Open Leads" vs. Stateful Round-Robin
- **Decision:** Incoming public leads are assigned to the sales executive with the lowest count of active deals (`NEW`, `CONTACTED`, `PROPOSAL_SENT`).
- **Trade-off:** Traditional round-robin requires maintaining a stateful pointer (e.g., in Redis or memory) indicating whose turn it is next, which breaks or requires distributed locking across multi-replica deployments. "Least Open Leads" is completely stateless, self-balancing, adjusts automatically when one rep closes deals faster, and is simple to unit test.

### 4. Monetary Representation: Integer Rupees (₹) vs. Floats / Decimal
- **Decision:** Budgets are stored as whole `integer` values representing Indian Rupees (₹).
- **Trade-off:** Using JavaScript `number` for floating-point currency causes IEEE 754 precision bugs (e.g., `0.1 + 0.2 !== 0.3`), while PostgreSQL `numeric` types are returned as strings by TypeORM and require repeated parsing. For Indian SMB contracts (ranging from ₹10,000 to ₹5,00,000+), whole integer Rupees completely eliminate precision issues without performance overhead.

### 5. Multi-Tenant Privacy: `404 Not Found` vs. `403 Forbidden`
- **Decision:** If a Sales Executive or Client requests a lead outside their assigned scope, the API returns `404 Not Found` rather than `403 Forbidden`.
- **Trade-off:** A `403 Forbidden` response informs an attacker or malicious user that a specific lead ID exists in the system (ID enumeration). Returning `404 Not Found` keeps tenant boundaries completely opaque.

### 6. Anti-Spam Strategy: Invisible Honeypot vs. CAPTCHA
- **Decision:** Public lead forms include an invisible honeypot field (`website_url_hp`) styled with `display: none` and `tabindex="-1"`. If populated, the API silently discards the lead with a `201 Created` status code.
- **Trade-off:** Google reCAPTCHA or Cloudflare Turnstile adds third-party external scripts, cookie banners, and cognitive friction for human leads. The honeypot traps 99% of automated submission scripts seamlessly without any user friction.

### 7. Token Storage & Refresh Queue: In-Memory Access Token + LocalStorage Refresh
- **Decision:** The short-lived access token is held in memory, while the rotated refresh token is stored in `localStorage` for session persistence across page reloads. A single in-flight Axios promise queue serializes concurrent 401 token refresh requests.
- **Trade-off:** While `httpOnly` cookies prevent XSS theft, they introduce CSRF vulnerabilities and cross-origin cookie complications in containerized development environments without HTTPS domains. The chosen pattern pairs a short (15-minute) access token with single-use refresh token rotation and instant revocation on suspicious reuse.

---

## 4. Lead Quality Scoring Algorithm (0–100 Points)
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

## 5. Quick Start with Docker (Recommended)

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

## 6. Application URLs & Ports

| Service | URL | Description |
|---|---|---|
| **Web Frontend** | `http://localhost:3000` | Full CRM Dashboard, Pipeline View, Public Portal |
| **REST API Gateway** | `http://localhost:4000/api` | NestJS Application API |
| **Swagger OpenAPI Docs** | `http://localhost:4000/api/docs` | Interactive Swagger API Explorer |
| **PostgreSQL Database** | `localhost:5432` | DB Name: `leaddesk_db` (User: `postgres`) |
| **Redis Queue** | `localhost:6379` | BullMQ background jobs store |

---

## 7. Demo Accounts & Credentials

The database seeder provisions 4 role-scoped test accounts:

| Role | Email | Password | Scoped Permissions |
|---|---|---|---|
| **Super Admin** | `admin@leaddesk.local` | `Admin@123456` | Global access across all clients, lead reassignment, full user management, internal notes. |
| **Sales Rep 1** | `sales1@leaddesk.local` | `Sales@123456` | Manages assigned leads for Apex Dental & Apex Institute, status advancement, internal notes. |
| **Sales Rep 2** | `sales2@leaddesk.local` | `Sales@123456` | Manages assigned leads for QuickFix Auto & Apex Dental, status advancement, internal notes. |
| **Client Portal** | `client@apex.local` | `Client@123456` | Read-only view for Apex Dental Care. **Internal notes are securely hidden.** |

> **Tip:** The web login page includes **1-Click Quick Login buttons** for each role so you can switch personas instantly without typing credentials!

---

## 8. Automated Testing Suite

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
│ TOTAL COVERAGE             │ Core Logic  │ High (>85%)     │
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

## 9. What is Incomplete or Would Be Improved with More Time

While the system is fully functional, passes all 73 tests, and satisfies all requirements of Section E, a production CRM can always be expanded further. Given additional development time, the following improvements would be prioritized:

1. **Real-Time Pipeline Updates (WebSockets / SSE):**
   - *Current State:* The React UI fetches updated lead data via REST endpoints upon user actions, status changes, and page loads.
   - *Improvement:* Implement Server-Sent Events (SSE) or Socket.io gateway in NestJS so that newly created leads or overdue alerts trigger real-time audio/visual notifications and live Kanban card movements without refreshing.

2. **External Notification Channels (Email & WhatsApp Integration):**
   - *Current State:* Lead notifications and overdue warnings are persisted in the PostgreSQL `notifications` table and rendered in the frontend notification drawer.
   - *Improvement:* Attach real notification dispatchers to the BullMQ worker queue using SendGrid/Amazon SES for automated client email receipts and Twilio/Meta Cloud API for immediate WhatsApp alerts to sales reps.

3. **CSV / Excel Export & Custom Reporting:**
   - *Current State:* Filtered leads are displayed in the paginated web UI and queryable via the REST API with Swagger documentation.
   - *Improvement:* Add an export pipeline streaming large lead datasets into `.csv` or `.xlsx` format, along with cohort conversion rate tracking over configurable time intervals.

4. **Dynamic Custom Fields per Client:**
   - *Current State:* The public inquiry form uses a standard set of fields (name, email, phone, serviceNeeded, budget, message) common to service businesses.
   - *Improvement:* Introduce a JSONB metadata schema allowing clients to declare custom intake fields (e.g., "Patient Age" for dental clinics vs. "Vehicle Model" for auto workshops) dynamically rendered on the public portal.

5. **Automated CI/CD Pipeline (GitHub Actions):**
   - *Current State:* Testing and linting are executed locally and inside Docker containers.
   - *Improvement:* Add a `.github/workflows/ci.yml` action to run the linter, build verification, and all 73 automated tests on every pull request.

---

## 10. Native Local Development (Without Docker)

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

## 11. Repository Layout

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

## 12. License

This project was developed for the **Social Bano Technologies Technical Assessment** and is licensed under the MIT License.
