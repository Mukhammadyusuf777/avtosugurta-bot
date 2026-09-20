-- Migration 0001: Create insurance_clients table and indexes
CREATE TABLE IF NOT EXISTS insurance_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    car_number TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', '+5 hours'))
);

CREATE INDEX IF NOT EXISTS idx_insurance_end_date ON insurance_clients(end_date);
CREATE INDEX IF NOT EXISTS idx_insurance_car_number ON insurance_clients(car_number);
CREATE INDEX IF NOT EXISTS idx_insurance_full_name ON insurance_clients(full_name);
