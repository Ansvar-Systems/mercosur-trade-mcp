import type Database from '@ansvar/mcp-sqlite';
import { BLOCS } from './common.js';
import { buildMeta } from '../utils/metadata.js';

export function about(db: InstanceType<typeof Database>) {
  const agreementCount = (db.prepare('SELECT COUNT(*) AS c FROM agreements').get() as { c: number }).c;
  const provisionCount = (db.prepare('SELECT COUNT(*) AS c FROM provisions').get() as { c: number }).c;
  const blocCount = (db.prepare('SELECT COUNT(*) AS c FROM trade_blocs').get() as { c: number }).c;
  const transferRuleCount = (db.prepare('SELECT COUNT(*) AS c FROM data_transfer_rules').get() as { c: number }).c;
  const mutualRecCount = (db.prepare('SELECT COUNT(*) AS c FROM mutual_recognition').get() as { c: number }).c;
  const digitalObligationCount = (db.prepare('SELECT COUNT(*) AS c FROM digital_trade_obligations').get() as { c: number }).c;

  return {
    name: 'mercosur-trade-mcp',
    version: '0.1.0',
    description:
      'Mercosur and LATAM trade agreements MCP — cross-border data transfers, mutual recognition, digital trade obligations.',
    blocs: Object.values(BLOCS).map((bloc) => ({
      id: bloc.id,
      name: bloc.name,
      member_count: bloc.members.length,
    })),
    statistics: {
      trade_blocs: blocCount,
      agreements: agreementCount,
      provisions: provisionCount,
      data_transfer_rules: transferRuleCount,
      mutual_recognition_agreements: mutualRecCount,
      digital_trade_obligations: digitalObligationCount,
    },
    tools: [
      'search_agreements',
      'get_provision',
      'get_data_transfer_rules',
      'get_mutual_recognition',
      'get_trade_bloc_rules',
      'check_digital_trade_obligations',
      'list_sources',
      'about',
      'check_data_freshness',
    ],
    publisher: 'Ansvar Systems AB',
    license: 'Apache-2.0',
    repository: 'https://github.com/Ansvar-Systems/mercosur-trade-mcp',
    network: {
      name: 'Ansvar MCP Network',
      directory: 'https://ansvar.ai/mcp',
    },
    _metadata: buildMeta(),
  };
}
