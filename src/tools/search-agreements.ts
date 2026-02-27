import type Database from '@ansvar/mcp-sqlite';
import { clampLimit, escapeFTS5Query } from './common.js';
import { buildMeta } from '../utils/metadata.js';

export interface SearchAgreementsInput {
  query: string;
  countries?: string[];
  topic?: string;
  limit?: number;
}

export function searchAgreements(db: InstanceType<typeof Database>, input: SearchAgreementsInput) {
  const limit = clampLimit(input.limit);
  const ftsQuery = escapeFTS5Query(input.query);

  let sql = `
    SELECT p.id, p.agreement_id, p.article_ref, p.title, p.chapter, p.topic,
           snippet(provisions_fts, 0, '>>>', '<<<', '...', 48) AS snippet,
           a.title AS agreement_title, a.parties,
           rank
    FROM provisions_fts
    JOIN provisions p ON p.id = provisions_fts.rowid
    JOIN agreements a ON a.id = p.agreement_id
    WHERE provisions_fts MATCH ?
  `;
  const params: unknown[] = [ftsQuery];

  if (input.topic) {
    sql += ' AND p.topic = ?';
    params.push(input.topic);
  }

  sql += ' ORDER BY rank LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

  // Post-filter by countries if provided (check if any listed country appears in parties)
  let filtered = rows;
  if (input.countries && input.countries.length > 0) {
    const codes = input.countries.map((c) => c.toUpperCase());
    filtered = rows.filter((row) => {
      const parties = String(row['parties'] ?? '');
      return codes.some((code) => parties.includes(code));
    });
  }

  return {
    query: input.query,
    filters: {
      countries: input.countries ?? null,
      topic: input.topic ?? null,
    },
    count: filtered.length,
    results: filtered,
    _meta: buildMeta(),
  };
}
