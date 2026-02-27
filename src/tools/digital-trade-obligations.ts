import type Database from '@ansvar/mcp-sqlite';
import { countryName } from './common.js';
import { buildMeta } from '../utils/metadata.js';

export interface CheckDigitalTradeObligationsInput {
  countries: string[];
}

export function checkDigitalTradeObligations(
  db: InstanceType<typeof Database>,
  input: CheckDigitalTradeObligationsInput,
) {
  if (!input.countries || input.countries.length === 0) {
    return {
      found: false,
      message: 'At least one country code is required.',
      _meta: buildMeta(),
    };
  }

  const codes = input.countries.map((c) => c.toUpperCase());

  // Build a query that finds obligations where the countries field contains
  // any of the requested country codes
  const placeholders = codes.map(() => '?').join(', ');
  const likeConditions = codes.map(() => 'dto.countries LIKE ?').join(' OR ');
  const likeParams = codes.map((code) => `%${code}%`);

  const obligations = db.prepare(`
    SELECT dto.id, dto.agreement_id, dto.countries, dto.obligation,
           dto.chapter, dto.description, dto.legal_basis,
           a.title AS agreement_title
    FROM digital_trade_obligations dto
    LEFT JOIN agreements a ON a.id = dto.agreement_id
    WHERE ${likeConditions}
    ORDER BY dto.agreement_id, dto.chapter
  `).all(...likeParams) as Record<string, unknown>[];

  if (obligations.length === 0) {
    return {
      found: false,
      countries: codes.map((code) => ({ code, name: countryName(code) })),
      message: `No digital trade obligations found for ${codes.map(countryName).join(', ')}.`,
      _meta: buildMeta(),
    };
  }

  return {
    found: true,
    countries: codes.map((code) => ({ code, name: countryName(code) })),
    count: obligations.length,
    obligations,
    _meta: buildMeta(),
  };
}
