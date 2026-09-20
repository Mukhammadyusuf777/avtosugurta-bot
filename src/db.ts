import { ClientStats, InsuranceClient, NewInsuranceClient } from './types';

/**
 * Returns YYYY-MM-DD formatted date string in Asia/Tashkent timezone
 */
export function getTashkentDateString(date: Date = new Date(), offsetDays: number = 0): string {
  const d = new Date(date.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Calculate difference in days between today (Tashkent) and target date string (YYYY-MM-DD)
 */
export function getDaysRemaining(endDateStr: string): number {
  const todayStr = getTashkentDateString();
  const today = new Date(todayStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  const diffTime = end.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export async function getAllClients(
  db: D1Database,
  limit: number = 10,
  offset: number = 0
): Promise<{ clients: InsuranceClient[]; total: number }> {
  const countResult = await db
    .prepare('SELECT COUNT(*) as total FROM insurance_clients')
    .first<{ total: number }>();
  const total = countResult?.total ?? 0;

  const { results } = await db
    .prepare(
      'SELECT id, full_name, car_number, policy_number, start_date, end_date, created_at FROM insurance_clients ORDER BY end_date ASC LIMIT ? OFFSET ?'
    )
    .bind(limit, offset)
    .all<InsuranceClient>();

  return { clients: results, total };
}

export async function getClientById(db: D1Database, id: number): Promise<InsuranceClient | null> {
  return await db
    .prepare('SELECT * FROM insurance_clients WHERE id = ?')
    .bind(id)
    .first<InsuranceClient>();
}

/**
 * Retrieve clients whose policies are expiring within the next `daysThreshold` days (or already expired)
 */
export async function getExpiringClients(
  db: D1Database,
  daysThreshold: number = 7
): Promise<InsuranceClient[]> {
  const todayStr = getTashkentDateString();
  const maxEndStr = getTashkentDateString(new Date(), daysThreshold);

  // We find policies that expire between today and today + daysThreshold (or already expired in past 30 days)
  const minEndStr = getTashkentDateString(new Date(), -30);

  const { results } = await db
    .prepare(
      `SELECT id, full_name, car_number, policy_number, start_date, end_date, created_at
       FROM insurance_clients
       WHERE end_date <= ? AND end_date >= ?
       ORDER BY end_date ASC`
    )
    .bind(maxEndStr, minEndStr)
    .all<InsuranceClient>();

  return results;
}

/**
 * Retrieve clients whose policy expires exactly in N days (used by daily Cron reminder)
 */
export async function getClientsExpiringInExactDays(
  db: D1Database,
  days: number = 7
): Promise<InsuranceClient[]> {
  const targetDateStr = getTashkentDateString(new Date(), days);

  const { results } = await db
    .prepare(
      `SELECT id, full_name, car_number, policy_number, start_date, end_date, created_at
       FROM insurance_clients
       WHERE end_date = ?
       ORDER BY full_name ASC`
    )
    .bind(targetDateStr)
    .all<InsuranceClient>();

  return results;
}

export async function getStats(db: D1Database): Promise<ClientStats> {
  const todayStr = getTashkentDateString();
  const in7DaysStr = getTashkentDateString(new Date(), 7);

  const totalRes = await db
    .prepare('SELECT COUNT(*) as c FROM insurance_clients')
    .first<{ c: number }>();

  const activeRes = await db
    .prepare('SELECT COUNT(*) as c FROM insurance_clients WHERE end_date >= ?')
    .bind(todayStr)
    .first<{ c: number }>();

  const expiringRes = await db
    .prepare('SELECT COUNT(*) as c FROM insurance_clients WHERE end_date >= ? AND end_date <= ?')
    .bind(todayStr, in7DaysStr)
    .first<{ c: number }>();

  const expiredRes = await db
    .prepare('SELECT COUNT(*) as c FROM insurance_clients WHERE end_date < ?')
    .bind(todayStr)
    .first<{ c: number }>();

  return {
    total: totalRes?.c ?? 0,
    active: activeRes?.c ?? 0,
    expiringIn7Days: expiringRes?.c ?? 0,
    expired: expiredRes?.c ?? 0,
  };
}

export async function searchClients(db: D1Database, query: string): Promise<InsuranceClient[]> {
  const cleanQuery = query.trim().replace(/%/g, '');
  const likePattern = `%${cleanQuery}%`;

  const { results } = await db
    .prepare(
      `SELECT id, full_name, car_number, policy_number, start_date, end_date, created_at
       FROM insurance_clients
       WHERE car_number LIKE ? OR full_name LIKE ? OR policy_number LIKE ?
       ORDER BY end_date ASC
       LIMIT 20`
    )
    .bind(likePattern, likePattern, likePattern)
    .all<InsuranceClient>();

  return results;
}

export async function addClient(
  db: D1Database,
  client: NewInsuranceClient
): Promise<InsuranceClient> {
  const result = await db
    .prepare(
      `INSERT INTO insurance_clients (full_name, car_number, policy_number, start_date, end_date)
       VALUES (?, ?, ?, ?, ?)
       RETURNING id, full_name, car_number, policy_number, start_date, end_date, created_at`
    )
    .bind(
      client.full_name.trim().toUpperCase(),
      client.car_number.trim().toUpperCase().replace(/\s+/g, ''),
      client.policy_number.trim().toUpperCase(),
      client.start_date.trim(),
      client.end_date.trim()
    )
    .first<InsuranceClient>();

  if (!result) {
    throw new Error("Mijozni bazaga saqlashda xatolik yuz berdi");
  }
  return result;
}

export async function addClientsBatch(
  db: D1Database,
  clients: NewInsuranceClient[]
): Promise<number> {
  if (clients.length === 0) return 0;

  const statements = clients.map((c) =>
    db
      .prepare(
        `INSERT INTO insurance_clients (full_name, car_number, policy_number, start_date, end_date)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        c.full_name.trim().toUpperCase(),
        c.car_number.trim().toUpperCase().replace(/\s+/g, ''),
        c.policy_number.trim().toUpperCase(),
        c.start_date.trim(),
        c.end_date.trim()
      )
  );

  const results = await db.batch(statements);
  return results.length;
}

export async function deleteClient(db: D1Database, id: number): Promise<boolean> {
  const res = await db.prepare('DELETE FROM insurance_clients WHERE id = ?').bind(id).run();
  return res.success;
}
