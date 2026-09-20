import { NewInsuranceClient } from './types';

export interface ParseResult {
  success: NewInsuranceClient[];
  errors: { line: string; reason: string }[];
}

/**
 * Normalizes date into YYYY-MM-DD string
 * Supports: YYYY-MM-DD, YYYY.MM.DD, DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
 */
export function normalizeDate(str: string): string | null {
  if (!str) return null;
  const trimmed = str.trim();

  // YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  const ruMatch = trimmed.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if (ruMatch) {
    const day = ruMatch[1].padStart(2, '0');
    const month = ruMatch[2].padStart(2, '0');
    const year = ruMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Extract two dates from a string (start date and end date)
 */
export function extractDateRange(str: string): { start: string; end: string } | null {
  // Matches separator like '—', '-', '->', 'gacha', 'to', etc.
  const dates = str.match(/\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./]\d{1,2}[-./]\d{4}/g);
  if (dates && dates.length >= 2) {
    const start = normalizeDate(dates[0]);
    const end = normalizeDate(dates[1]);
    if (start && end) {
      return { start, end };
    }
  }
  return null;
}

/**
 * Parse a single line of text
 */
export function parseClientLine(rawLine: string): NewInsuranceClient | null {
  let line = rawLine.trim();
  if (!line || line.startsWith('#') || line.startsWith('//')) {
    return null;
  }

  // Remove leading numbering like "1. ", "12) ", "[1] "
  line = line.replace(/^\s*(?:\[\d+\]|\d+[.)])\s*/, '').trim();

  // 1. Try delimiter based: pipe (|), tab (\t), or semicolon (;)
  const delimiters = ['|', '\t', ';'];
  for (const delim of delimiters) {
    if (line.includes(delim)) {
      const parts = line.split(delim).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 4) {
        const fullName = parts[0].trim();
        const carNumber = parts[1].trim().toUpperCase().replace(/\s+/g, '');
        const policyNumber = parts[2].trim().toUpperCase();

        // 4th part (and 5th part if separate dates)
        let dates: { start: string; end: string } | null = null;
        if (parts.length >= 5) {
          const s = normalizeDate(parts[3]);
          const e = normalizeDate(parts[4]);
          if (s && e) dates = { start: s, end: e };
        } else {
          dates = extractDateRange(parts[3]);
        }

        if (fullName && carNumber && policyNumber && dates) {
          return {
            full_name: fullName,
            car_number: carNumber,
            policy_number: policyNumber,
            start_date: dates.start,
            end_date: dates.end,
          };
        }
      }
    }
  }

  // 2. Try regex extraction for freeform lines
  // Find dates first
  const dateRange = extractDateRange(line);
  if (!dateRange) return null;

  // Find Uzbek car registration plates (e.g. 60O664OO, 01A123BC, 60Z352FB, 01777AAA)
  const plateMatch = line.match(/\b(\d{2}\s*[A-Z0-9]{5,7})\b/i);
  if (!plateMatch) return null;
  const carNumber = plateMatch[1].replace(/\s+/g, '').toUpperCase();

  // Find policy (e.g. EAPL 2256920 or 2256920 or similar)
  const policyMatch = line.match(/\b((?:EAPL|eapl)?\s*\d{6,8})\b/i);
  const policyNumber = policyMatch ? policyMatch[1].trim().toUpperCase() : 'POLIS';

  // Remove found parts to isolate full name
  let cleaned = line
    .replace(dateRange.start, '')
    .replace(dateRange.end, '')
    .replace(plateMatch[0], '')
    .replace(/[—–\-><|,;]/g, ' ')
    .trim();

  if (policyMatch) {
    cleaned = cleaned.replace(policyMatch[0], '').trim();
  }

  // Clean up remaining text to get full name
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  if (cleaned.length >= 4) {
    return {
      full_name: cleaned.toUpperCase(),
      car_number: carNumber,
      policy_number: policyNumber.startsWith('EAPL') ? policyNumber : `EAPL ${policyNumber}`,
      start_date: dateRange.start,
      end_date: dateRange.end,
    };
  }

  return null;
}

/**
 * Parse multi-line text or document content
 */
export function parseClientsText(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const success: NewInsuranceClient[] = [];
  const errors: { line: string; reason: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.toLowerCase().startsWith('f.i.o') || rawLine.toLowerCase().startsWith('ism')) {
      continue; // Skip headers or empty lines
    }

    const client = parseClientLine(rawLine);
    if (client) {
      success.push(client);
    } else {
      errors.push({
        line: rawLine,
        reason: "Ma'lumotlar to'liq aniqlanmadi (F.I.O, avto raqami, polis yoki sana yetarli emas)",
      });
    }
  }

  return { success, errors };
}
