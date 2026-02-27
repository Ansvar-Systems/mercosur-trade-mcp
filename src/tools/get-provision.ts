import type Database from '@ansvar/mcp-sqlite';
import { buildMeta } from '../utils/metadata.js';

export interface GetProvisionInput {
  agreement_id: string;
  article: string;
}

export function getProvision(db: InstanceType<typeof Database>, input: GetProvisionInput) {
  const row = db.prepare(`
    SELECT p.id, p.agreement_id, p.article_ref, p.title, p.content,
           p.chapter, p.topic,
           a.title AS agreement_title, a.official_name, a.year,
           a.status AS agreement_status, a.source_url, a.parties
    FROM provisions p
    JOIN agreements a ON a.id = p.agreement_id
    WHERE p.agreement_id = ? AND p.article_ref = ?
  `).get(input.agreement_id, input.article);

  if (!row) {
    return {
      found: false,
      agreement_id: input.agreement_id,
      article: input.article,
      message: `No provision found for article "${input.article}" in agreement "${input.agreement_id}".`,
      _metadata: buildMeta(),
    };
  }

  return {
    found: true,
    provision: row,
    _metadata: buildMeta(),
  };
}
