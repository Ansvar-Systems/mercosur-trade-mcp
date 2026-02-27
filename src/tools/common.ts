/**
 * Shared constants, types, and utility functions for Mercosur Trade MCP tools.
 */

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;

// ── Trade Bloc Membership ────────────────────────────────────────────────

/** Mercosur full members (Estado Parte) */
export const MERCOSUR_MEMBERS = ['BR', 'AR', 'UY', 'PY'] as const;

/** Mercosur associate states (Estado Asociado) */
export const MERCOSUR_ASSOCIATES = ['CL', 'CO', 'EC', 'PE', 'GY', 'SR'] as const;

/** Pacific Alliance full members */
export const PACIFIC_ALLIANCE = ['CL', 'CO', 'MX', 'PE'] as const;

/** PROSUR members */
export const PROSUR_MEMBERS = ['AR', 'BR', 'CL', 'CO', 'EC', 'GY', 'PE', 'PY', 'SR', 'UY'] as const;

/** All LATAM country codes covered by this MCP */
export const ALL_COUNTRIES = [
  ...new Set([
    ...MERCOSUR_MEMBERS,
    ...MERCOSUR_ASSOCIATES,
    ...PACIFIC_ALLIANCE,
    ...PROSUR_MEMBERS,
    'MX', 'BO', 'VE',
  ]),
] as const;

export type CountryCode = (typeof ALL_COUNTRIES)[number];

export const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Argentina',
  BO: 'Bolivia',
  BR: 'Brazil',
  CL: 'Chile',
  CO: 'Colombia',
  EC: 'Ecuador',
  GY: 'Guyana',
  MX: 'Mexico',
  PE: 'Peru',
  PY: 'Paraguay',
  SR: 'Suriname',
  UY: 'Uruguay',
  VE: 'Venezuela',
};

export const BLOCS = {
  mercosur: {
    id: 'mercosur',
    name: 'Mercosur',
    full_name: 'Mercado Comun del Sur (Southern Common Market)',
    members: [...MERCOSUR_MEMBERS],
    associates: [...MERCOSUR_ASSOCIATES],
  },
  pacific_alliance: {
    id: 'pacific_alliance',
    name: 'Pacific Alliance',
    full_name: 'Alianza del Pacifico',
    members: [...PACIFIC_ALLIANCE],
    associates: [] as string[],
  },
  prosur: {
    id: 'prosur',
    name: 'PROSUR',
    full_name: 'Forum for the Progress and Development of South America',
    members: [...PROSUR_MEMBERS],
    associates: [] as string[],
  },
} as const;

export type BlocId = keyof typeof BLOCS;

// ── Utility functions ────────────────────────────────────────────────────

/** Clamp a limit value to [1, MAX_LIMIT], defaulting to DEFAULT_LIMIT. */
export function clampLimit(limit: number | undefined, fallback = DEFAULT_LIMIT): number {
  const value = Number.isFinite(limit) ? Number(limit) : fallback;
  return Math.min(Math.max(Math.trunc(value), 1), MAX_LIMIT);
}

/** Escape characters that have special meaning in FTS5 queries. */
export function escapeFTS5Query(query: string): string {
  return query.replace(/[()^*:]/g, (char) => `"${char}"`);
}

/** Number of days since a date string, or null if unparseable. */
export function daysSince(dateValue: string | null | undefined, now = new Date()): number | null {
  if (!dateValue) return null;
  const timestamp = Date.parse(dateValue);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000));
}

/** Return an ISO date string (YYYY-MM-DD) for the given or current date. */
export function toIsoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Resolve a human-readable country name from a code, falling back to the code itself. */
export function countryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}
