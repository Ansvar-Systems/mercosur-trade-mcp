import type Database from '@ansvar/mcp-sqlite';
import { BLOCS, type BlocId, countryName, clampLimit } from './common.js';
import { buildMeta } from '../utils/metadata.js';

export interface GetTradeBlocRulesInput {
  bloc: string;
}

export function getTradeBlocRules(
  db: InstanceType<typeof Database>,
  input: GetTradeBlocRulesInput,
) {
  const blocId = input.bloc.toLowerCase() as BlocId;
  const blocInfo = BLOCS[blocId];

  if (!blocInfo) {
    return {
      found: false,
      bloc: input.bloc,
      message: `Unknown trade bloc "${input.bloc}". Valid values: mercosur, pacific_alliance, prosur.`,
      _meta: buildMeta(),
    };
  }

  // Fetch bloc record from database
  const blocRow = db.prepare(`
    SELECT id, name, full_name, founded_year, website,
           member_countries, associate_countries
    FROM trade_blocs
    WHERE id = ?
  `).get(blocId) as Record<string, unknown> | undefined;

  // Fetch agreements for this bloc
  const agreements = db.prepare(`
    SELECT id, title, official_name, year, agreement_type,
           parties, status, source_url
    FROM agreements
    WHERE bloc_id = ?
    ORDER BY year DESC
  `).all(blocId) as Record<string, unknown>[];

  // Count provisions for this bloc
  const provisionCount = (
    db.prepare(`
      SELECT COUNT(*) AS c
      FROM provisions p
      JOIN agreements a ON a.id = p.agreement_id
      WHERE a.bloc_id = ?
    `).get(blocId) as { c: number }
  ).c;

  return {
    found: true,
    bloc: {
      ...(blocRow ?? {}),
      id: blocInfo.id,
      name: blocInfo.name,
      full_name: blocInfo.full_name,
      members: blocInfo.members.map((code) => ({ code, name: countryName(code) })),
      associates: blocInfo.associates.map((code) => ({ code, name: countryName(code) })),
    },
    agreements: {
      count: agreements.length,
      items: agreements,
    },
    provisions_count: provisionCount,
    _meta: buildMeta(),
  };
}
