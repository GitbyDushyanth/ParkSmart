-- Migration 002: Add completed_at column to reservations
-- Enables recording the exact completion timestamp for finished parking sessions

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_reservations_completed_at
  ON reservations (completed_at DESC);
