-- ParkSmart Seed Data
-- Run AFTER schema.sql to populate initial parking slots

-- Section A — 10 Regular slots
INSERT INTO parking_slots (slot_number, slot_type, status) VALUES
  ('A01', 'regular', 'available'),
  ('A02', 'regular', 'available'),
  ('A03', 'regular', 'available'),
  ('A04', 'regular', 'available'),
  ('A05', 'regular', 'available'),
  ('A06', 'regular', 'available'),
  ('A07', 'regular', 'available'),
  ('A08', 'regular', 'available'),
  ('A09', 'regular', 'available'),
  ('A10', 'regular', 'available')
ON CONFLICT (slot_number) DO NOTHING;

-- Section B — 6 Compact slots
INSERT INTO parking_slots (slot_number, slot_type, status) VALUES
  ('B01', 'compact', 'available'),
  ('B02', 'compact', 'available'),
  ('B03', 'compact', 'available'),
  ('B04', 'compact', 'available'),
  ('B05', 'compact', 'available'),
  ('B06', 'compact', 'available')
ON CONFLICT (slot_number) DO NOTHING;

-- Section C — 4 Electric vehicle slots
INSERT INTO parking_slots (slot_number, slot_type, status) VALUES
  ('C01', 'electric', 'available'),
  ('C02', 'electric', 'available'),
  ('C03', 'electric', 'available'),
  ('C04', 'electric', 'available')
ON CONFLICT (slot_number) DO NOTHING;

-- Section D — 4 Accessible slots
INSERT INTO parking_slots (slot_number, slot_type, status) VALUES
  ('D01', 'accessible', 'available'),
  ('D02', 'accessible', 'available'),
  ('D03', 'accessible', 'maintenance'),
  ('D04', 'accessible', 'available')
ON CONFLICT (slot_number) DO NOTHING;

-- Section E — 2 Large vehicle slots
INSERT INTO parking_slots (slot_number, slot_type, status) VALUES
  ('E01', 'large', 'available'),
  ('E02', 'large', 'available')
ON CONFLICT (slot_number) DO NOTHING;
