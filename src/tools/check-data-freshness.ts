import type Database from '@ansvar/mcp-sqlite';
import { daysSince, toIsoDate } from './common.js';
import { buildMeta } from '../utils/metadata.js';

export function checkDataFreshness(db: InstanceType<typeof Database>) {
  const sources = db.prepare(`
    SELECT id, full_name, authority, jurisdiction, last_fetched, last_updated, item_count
    FROM sources
    ORDER BY authority
  `).all() as Array<{
    id: string;
    full_name: string;
    authority: string;
    jurisdiction: string;
    last_fetched: string | null;
    last_updated: string | null;
    item_count: number;
  }>;

  const now = new Date();
  const STALE_THRESHOLD_DAYS = 90;

  const freshness = sources.map((source) => {
    const age = daysSince(source.last_fetched, now);
    return {
      source_id: source.id,
      full_name: source.full_name,
      authority: source.authority,
      last_fetched: source.last_fetched,
      last_updated: source.last_updated,
      item_count: source.item_count,
      age_days: age,
      is_stale: age !== null && age > STALE_THRESHOLD_DAYS,
    };
  });

  const staleSources = freshness.filter((s) => s.is_stale);

  // Aggregate stats per bloc
  const blocStats = db.prepare(`
    SELECT tb.id AS bloc_id, tb.name AS bloc_name,
           COUNT(DISTINCT a.id) AS agreement_count,
           MAX(a.last_updated) AS newest_update
    FROM trade_blocs tb
    LEFT JOIN agreements a ON a.bloc_id = tb.id
    GROUP BY tb.id
    ORDER BY tb.id
  `).all() as Array<{
    bloc_id: string;
    bloc_name: string;
    agreement_count: number;
    newest_update: string | null;
  }>;

  const blocFreshness = blocStats.map((row) => ({
    bloc_id: row.bloc_id,
    bloc_name: row.bloc_name,
    agreement_count: row.agreement_count,
    newest_update: row.newest_update,
    age_days: daysSince(row.newest_update, now),
  }));

  return {
    checked_at: toIsoDate(now),
    stale_threshold_days: STALE_THRESHOLD_DAYS,
    stale_count: staleSources.length,
    total_sources: sources.length,
    sources: freshness,
    blocs: blocFreshness,
    _metadata: buildMeta(),
  };
}
