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
│   │   ├── pool.js            # PostgreSQL connection pool
│   │   ├── schema.sql         # Database schema
│   │   ├── seed.sql           # Initial slot data
│   │   ├── setup.js           # Schema runner
│   │   └── seed.js            # Seed runner
│   ├── middleware/
│   │   └── auth.js            # JWT + admin middleware
│   ├── routes/
│   │   ├── auth.js            # /api/auth/*
│   │   ├── slots.js           # /api/slots/*
│   │   ├── reservations.js    # /api/reservations/*
│   │   └── dashboard.js       # /api/dashboard/*
│   ├── scripts/
│   │   └── createAdmin.js     # Admin creation CLI
│   └── index.js               # Express server entry
│
└── client/                    # React + Vite frontend
    └── src/
        ├── api/
        │   ├── axios.js        # Configured axios instance
        │   └── services.js     # API service functions
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── StatCard.jsx
        │   ├── Alert.jsx
        │   └── LoadingSpinner.jsx
        ├── context/
        │   └── AuthContext.jsx
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── DriverDashboard.jsx
        │   ├── ParkingSlots.jsx
        │   ├── MyReservations.jsx
        │   ├── AdminDashboard.jsx
        │   ├── AdminSlots.jsx
        │   └── AdminReservations.jsx
        ├── App.jsx             # React Router routes
        ├── main.jsx            # React entry
        └── index.css           # Full CSS design system
```

---

## 🔌 API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Server + DB health check |
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user profile |
| GET | `/api/slots` | JWT | All slots with reservation status |
| POST | `/api/slots` | Admin | Create new slot |
| PATCH | `/api/slots/:id/status` | Admin | Update operational status |
| GET | `/api/reservations/mine` | JWT | User's own reservations |
| GET | `/api/reservations` | Admin | All reservations |
| POST | `/api/reservations` | JWT | Reserve a slot |
| PATCH | `/api/reservations/:id/cancel` | JWT | Cancel a reservation |
| GET | `/api/dashboard/stats` | Admin | Aggregated statistics |

---

## 👥 Roles

| Feature | User/Driver | Administrator |
|---------|-------------|---------------|
| Register & login | ✅ | ✅ (CLI only) |
| View parking slots | ✅ | ✅ |
| Reserve a slot | ✅ | — |
| Cancel own reservation | ✅ | ✅ (any) |
| View own reservations | ✅ | — |
| View all reservations | — | ✅ |
| Create/manage slots | — | ✅ |
| Dashboard statistics | Basic | Full |

---

## 🛡️ Security Features

- Passwords hashed with bcrypt (cost factor 12)
- JWT authentication with 7-day expiry
- Admin registration only via secure CLI script
- Parameterized SQL queries (no SQL injection)
- Role claims never trusted from frontend
- Ownership verified before cancellation
- FOR UPDATE row locking prevents double-booking
- Partial unique index: `(slot_id) WHERE status = 'active'`

---

## 🧪 Manual Testing Checklist

- [ ] Server starts without errors
- [ ] `GET /api/health` returns `{ status: "healthy" }`
- [ ] Register with a new email → redirect to dashboard
- [ ] Register with same email → error message
- [ ] Login with wrong password → generic error
- [ ] Access `/admin` as a regular user → redirected
- [ ] View slot grid — green/blue/red/grey slots render
- [ ] Click an available slot → confirm modal → reserve
- [ ] Second click on same slot → "already reserved" error
- [ ] Cancel from My Reservations → slot turns green again
- [ ] Admin login → sees stats and reservation table
- [ ] Admin creates a new slot → appears in table
- [ ] Admin changes slot status to maintenance
- [ ] Admin cancels any reservation
- [ ] Refresh browser → data persists from database
- [ ] `npm run build` inside `client/` succeeds

---

## ⚠️ Known Limitations

1. **No real-time push**: Slot grid refreshes only on user action or manual refresh (no WebSockets).
2. **Manual occupancy**: Physical occupancy must be updated by admin; no IoT or camera integration.
3. **No payments**: No payment gateway is integrated.
4. **No email notifications**: No email confirmation or reminder system.
5. **Single admin**: Only one admin account created via CLI; no multi-admin UI.

---

## 🔮 Future Improvements

- WebSocket live updates for slot status
- QR code check-in / check-out
- Email confirmations via SendGrid
- Payment integration (Stripe)
- Analytics dashboard with charts
- Mobile app (React Native)
- License plate recognition
- Multi-location support
