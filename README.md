# ParkSmart — Smart Parking Management System

A full-stack PERN (PostgreSQL, Express, React, Node.js) application that digitizes parking operations with real-time slot management, secure reservations, and role-based dashboards.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (you have v24.19.0)
- A PostgreSQL database (Supabase, Neon, or local)

### 1. Clone & install

```bash
# Backend dependencies (run from root)
npm install

# Frontend dependencies
cd client && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=a-long-random-secret-string
PORT=3001
NODE_ENV=development
```

> **For Supabase**: Use the connection string from Project → Settings → Database → Connection string (URI mode).
> **For Neon**: Use the connection string with `?sslmode=require` appended.

### 3. Initialize the database

```bash
# Create schema tables
npm run setup-db

# Seed initial parking slots (26 slots)
npm run seed

# Create admin account (default: admin@parksmart.local / Admin@1234)
npm run create-admin

# Or with custom credentials:
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YourPassword npm run create-admin
```

### 4. Start the application

**Two terminal windows:**

```bash
# Terminal 1 — Backend (port 3001)
npm run dev:server

# Terminal 2 — Frontend (port 5173)
npm run dev:client
```

Open **http://localhost:5173** in your browser.

---

## 🏗️ Architecture

```
ParkSmart/
├── server/                    # Express backend
│   ├── db/
│   │   ├── migrations/        # Incremental SQL migrations
│   │   │   └── 001_performance_indexes.sql
│   │   ├── pool.js            # PostgreSQL connection pool
│   │   ├── schema.sql         # Database schema
│   │   ├── seed.sql           # Initial slot data
│   │   ├── setup.js           # Schema runner
│   │   ├── migrate.js         # Migration runner
│   │   └── seed.js            # Seed runner
│   ├── middleware/
│   │   └── auth.js            # Authoritative JWT + DB role verification
│   ├── routes/
│   │   ├── auth.js            # /api/auth/* (auth, profile, password)
│   │   ├── slots.js           # /api/slots/*
│   │   ├── reservations.js    # /api/reservations/*
│   │   ├── dashboard.js       # /api/dashboard/* (analytics & activity)
│   │   └── users.js           # /api/users/* (admin user management)
│   ├── scripts/
│   │   └── createAdmin.js     # Admin creation/reset CLI
│   ├── tests/
│   │   └── run_tests.js       # Comprehensive automated test suite
│   └── index.js               # Express server entry
│
└── client/                    # React + Vite frontend
    └── src/
        ├── api/
        │   ├── axios.js        # Configured axios instance
        │   └── services.js     # API service functions
        ├── components/
        │   ├── Navbar.jsx      # Role-aware responsive navigation
        │   ├── ProtectedRoute.jsx
        │   ├── StatCard.jsx
        │   ├── Alert.jsx
        │   └── LoadingSpinner.jsx
        ├── context/
        │   └── AuthContext.jsx # Auth state & server profile sync
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── DriverDashboard.jsx
        │   ├── ParkingSlots.jsx
        │   ├── MyReservations.jsx
        │   ├── ProfilePage.jsx         # User profile & account security
        │   ├── AdminDashboard.jsx      # Analytics, utilization & trends
        │   ├── AdminSlots.jsx
        │   ├── AdminReservations.jsx
        │   └── AdminUsers.jsx          # Admin user management & details
        ├── App.jsx             # React Router routes with guards
        ├── main.jsx            # React entry
        └── index.css           # Full CSS design system
```

---

## 🔌 API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Server + DB health check |
| POST | `/api/auth/register` | — | Register new driver (role forced to `user`) |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user profile + booking statistics |
| PUT | `/api/auth/profile` | JWT | Update user name & email (whitelisted fields) |
| PUT | `/api/auth/change-password` | JWT | Change password with current password check |
| GET | `/api/slots` | JWT | All slots with reservation overlay |
| POST | `/api/slots` | Admin | Create new slot |
| PATCH | `/api/slots/:id/status` | Admin | Update operational status |
| GET | `/api/reservations/mine` | JWT | User's own reservations |
| GET | `/api/reservations` | Admin | All reservations across users |
| POST | `/api/reservations` | JWT | Atomically reserve available slot |
| PATCH | `/api/reservations/:id/cancel` | JWT | Cancel reservation (owner or admin) |
| GET | `/api/dashboard/stats` | Admin | KPIs, 7-day timeline & recent activity |
| GET | `/api/users` | Admin | User listing with search, filter & pagination |
| GET | `/api/users/:id` | Admin/Self | User profile details & reservation history |
| PATCH | `/api/users/:id/role` | Admin | Promote/demote role with self-demote safety |
| DELETE | `/api/users/:id` | Admin | Safely remove user account |

---

## 👥 Roles & Permissions

| Feature | Driver / User | Administrator |
|---------|---------------|---------------|
| Register & login | ✅ | ✅ |
| Manage personal profile | ✅ | ✅ |
| Change account password | ✅ | ✅ |
| View parking slots | ✅ | ✅ |
| Reserve available slots | ✅ | — |
| View own reservation history | ✅ | ✅ |
| Cancel own active reservations | ✅ | ✅ |
| Manage parking slot inventory | — | ✅ |
| Cancel any reservation | — | ✅ |
| View all reservations | — | ✅ |
| Operational dashboard & analytics | Basic | Full (with charts) |
| User management & role assignment | — | ✅ |

---

## 🛡️ Security Features

- Passwords hashed with bcrypt (cost factor 12)
- JWT authentication with server-side database record verification
- Admin registration only via secure CLI script
- Mass-assignment and privilege escalation protection on registration and profile updates
- Parameterized SQL queries on all routes (no SQL injection)
- Role claims verified against database on every authenticated request
- Ownership verified before reservation cancellation
- `FOR UPDATE` row locking prevents race conditions and double-booking
- Partial unique index: `(slot_id) WHERE status = 'active'`
- Safe administrative account protection (self-demotion and self-deletion prevented)

---

## 🧪 Testing

Run the full automated test suite (verifying 45+ security and functional test cases):

```bash
npm test
# Or on Windows:
npm.cmd test
```

Build the frontend for production:

```bash
npm.cmd --prefix client run build
```

---

## ⚠️ Known Limitations

1. **No real-time push**: Slot grid refreshes on user action, manual refresh, or 30-second polling (no WebSockets yet).
2. **Manual occupancy**: Physical occupancy must be updated by admin; no IoT/sensor integration.
3. **No payments**: No payment gateway is integrated.
4. **No email notifications**: No SMTP service integrated.

