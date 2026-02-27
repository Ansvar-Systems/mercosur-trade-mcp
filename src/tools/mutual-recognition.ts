import type Database from '@ansvar/mcp-sqlite';
import { countryName } from './common.js';
import { buildMeta } from '../utils/metadata.js';

export interface GetMutualRecognitionInput {
  country_a: string;
  country_b: string;
  domain?: string;
}

export function getMutualRecognition(
  db: InstanceType<typeof Database>,
  input: GetMutualRecognitionInput,
) {
  const a = input.country_a.toUpperCase();
  const b = input.country_b.toUpperCase();

  let sql = `
    SELECT mr.id, mr.country_a, mr.country_b, mr.domain,
           mr.agreement_id, mr.description, mr.status,
           a.title AS agreement_title
    FROM mutual_recognition mr
    LEFT JOIN agreements a ON a.id = mr.agreement_id
    WHERE (
      (mr.country_a = ? AND mr.country_b = ?)
      OR (mr.country_a = ? AND mr.country_b = ?)
    )
  `;
  const params: unknown[] = [a, b, b, a];

  if (input.domain) {
    sql += ' AND mr.domain = ?';
    params.push(input.domain);
  }

  sql += ' ORDER BY mr.domain';

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

  if (rows.length === 0) {
    const domainMsg = input.domain ? ` in domain "${input.domain}"` : '';
    return {
      found: false,
      country_a: a,
      country_a_name: countryName(a),
      country_b: b,
      country_b_name: countryName(b),
      domain: input.domain ?? null,
      message: `No mutual recognition agreements found between ${countryName(a)} and ${countryName(b)}${domainMsg}.`,
      _meta: buildMeta(),
    };
  }

  return {
    found: true,
    country_a: a,
    country_a_name: countryName(a),
    country_b: b,
    country_b_name: countryName(b),
    domain: input.domain ?? null,
    count: rows.length,
    agreements: rows,
    _meta: buildMeta(),
  };
}
