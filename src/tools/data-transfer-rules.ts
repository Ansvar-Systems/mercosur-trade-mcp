import type Database from '@ansvar/mcp-sqlite';
import { countryName } from './common.js';
import { buildMeta } from '../utils/metadata.js';

export interface GetDataTransferRulesInput {
  source_country: string;
  dest_country: string;
}

export function getDataTransferRules(
  db: InstanceType<typeof Database>,
  input: GetDataTransferRulesInput,
) {
  const src = input.source_country.toUpperCase();
  const dst = input.dest_country.toUpperCase();

  // Try exact direction first, then reverse
  let row = db.prepare(`
    SELECT id, source_country, dest_country, framework, adequacy_status,
           transfer_mechanisms, restrictions, legal_basis
    FROM data_transfer_rules
    WHERE source_country = ? AND dest_country = ?
  `).get(src, dst) as Record<string, unknown> | undefined;

  let reversed = false;
  if (!row) {
    row = db.prepare(`
      SELECT id, source_country, dest_country, framework, adequacy_status,
             transfer_mechanisms, restrictions, legal_basis
      FROM data_transfer_rules
      WHERE source_country = ? AND dest_country = ?
    `).get(dst, src) as Record<string, unknown> | undefined;
    if (row) reversed = true;
  }

  if (!row) {
    return {
      found: false,
      source_country: src,
      source_country_name: countryName(src),
      dest_country: dst,
      dest_country_name: countryName(dst),
      message: `No data transfer rules found between ${countryName(src)} and ${countryName(dst)}.`,
      _metadata: buildMeta(),
    };
  }

  return {
    found: true,
    source_country: src,
    source_country_name: countryName(src),
    dest_country: dst,
    dest_country_name: countryName(dst),
    reversed_lookup: reversed,
    rules: row,
    _metadata: buildMeta(),
  };
}
