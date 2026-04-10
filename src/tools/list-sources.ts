import type Database from '@ansvar/mcp-sqlite';
import { buildMeta } from '../utils/metadata.js';

export function listSources(db: InstanceType<typeof Database>) {
  const sources = db.prepare(`
    SELECT id, full_name, authority, jurisdiction, source_url,
           last_fetched, last_updated, item_count
    FROM sources
    ORDER BY authority, jurisdiction
  `).all() as Record<string, unknown>[];

  const agreementCount = (db.prepare('SELECT COUNT(*) AS c FROM agreements').get() as { c: number }).c;
  const provisionCount = (db.prepare('SELECT COUNT(*) AS c FROM provisions').get() as { c: number }).c;
  const blocCount = (db.prepare('SELECT COUNT(*) AS c FROM trade_blocs').get() as { c: number }).c;

  return {
    sources,
    totals: {
      trade_blocs: blocCount,
      agreements: agreementCount,
      provisions: provisionCount,
    },
    _meta: buildMeta(),
  };
}
