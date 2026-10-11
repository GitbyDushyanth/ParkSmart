-- Migration 001: Performance Indexes
-- Backward-compatible, safe, idempotent index additions

CREATE INDEX IF NOT EXISTS idx_reservations_reserved_at
  ON reservations (reserved_at DESC);
