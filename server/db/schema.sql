-- ParkSmart Database Schema
-- Run this file to initialize the database structure

-- Enable UUID extension if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ============================================================
-- PARKING SLOTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS parking_slots (
  id             SERIAL PRIMARY KEY,
  slot_number    VARCHAR(20) UNIQUE NOT NULL,
  slot_type      VARCHAR(30) NOT NULL DEFAULT 'regular'
                   CHECK (slot_type IN ('regular', 'accessible', 'electric', 'compact', 'large')),
  status         VARCHAR(20) NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available', 'occupied', 'maintenance')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_status ON parking_slots (status);

-- ============================================================
-- RESERVATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_id       INTEGER NOT NULL REFERENCES parking_slots(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'cancelled', 'completed')),
  reserved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at  TIMESTAMPTZ,
  CONSTRAINT chk_cancelled_at CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (status <> 'cancelled' AND cancelled_at IS NULL)
  )
);

-- Prevent two active reservations for the same slot simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_slot_active
  ON reservations (slot_id)
  WHERE status = 'active';

-- Fast lookups by user
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations (user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);

-- ============================================================
-- DONE
-- ============================================================
