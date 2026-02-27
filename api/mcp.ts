import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from '@ansvar/mcp-sqlite';
import { join } from 'path';
import { existsSync, copyFileSync, rmSync } from 'fs';

import { searchAgreements, type SearchAgreementsInput } from '../src/tools/search-agreements.js';
import { getProvision, type GetProvisionInput } from '../src/tools/get-provision.js';
import { getDataTransferRules, type GetDataTransferRulesInput } from '../src/tools/data-transfer-rules.js';
import { getMutualRecognition, type GetMutualRecognitionInput } from '../src/tools/mutual-recognition.js';
import { getTradeBlocRules, type GetTradeBlocRulesInput } from '../src/tools/trade-bloc-rules.js';
import { checkDigitalTradeObligations, type CheckDigitalTradeObligationsInput } from '../src/tools/digital-trade-obligations.js';
import { listSources } from '../src/tools/list-sources.js';
import { about } from '../src/tools/about.js';
import { checkDataFreshness } from '../src/tools/check-data-freshness.js';

const SERVER_NAME = 'mercosur-trade-mcp';
const SERVER_VERSION = '0.1.0';

const SOURCE_DB =
  process.env.MERCOSUR_TRADE_DB_PATH ||
  join(process.cwd(), 'data', 'database.db');
const TMP_DB = '/tmp/database.db';
const TMP_DB_LOCK = '/tmp/database.db.lock';

let db: InstanceType<typeof Database> | null = null;

function getDatabase(): InstanceType<typeof Database> {
  if (!db) {
    if (existsSync(TMP_DB_LOCK)) {
      rmSync(TMP_DB_LOCK, { recursive: true, force: true });
    }
    if (!existsSync(TMP_DB)) {
      copyFileSync(SOURCE_DB, TMP_DB);
    }
    db = new Database(TMP_DB, { readonly: true });
  }
  return db;
}

const TOOLS = [
  {
    name: 'search_agreements',
    description:
      'Full-text search across Mercosur, Pacific Alliance, PROSUR, and bilateral trade agreements. Returns matching provisions with relevance ranking.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query (e.g., "data localization", "digital services", "customs union")' },
        countries: { type: 'array', items: { type: 'string' }, description: 'Filter by party countries using ISO 3166-1 alpha-2 codes (e.g., ["BR", "AR"])' },
        topic: { type: 'string', description: 'Filter by topic (e.g., "data_transfer", "digital_trade", "customs", "investment", "services")' },
        limit: { type: 'number', description: 'Max results to return (default 10, max 50)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description: 'Retrieve a single provision (article) from a trade agreement by agreement ID and article reference.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agreement_id: { type: 'string', description: 'Agreement identifier (e.g., "treaty-of-asuncion", "pa-additional-protocol")' },
        article: { type: 'string', description: 'Article reference (e.g., "1", "12.3", "Annex I")' },
      },
      required: ['agreement_id', 'article'],
    },
  },
  {
    name: 'get_data_transfer_rules',
    description: 'Retrieve bilateral data transfer framework between two countries, including adequacy status, transfer mechanisms, and restrictions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        source_country: { type: 'string', description: 'Source country ISO 3166-1 alpha-2 code (e.g., "BR")' },
        dest_country: { type: 'string', description: 'Destination country ISO 3166-1 alpha-2 code (e.g., "AR")' },
      },
      required: ['source_country', 'dest_country'],
    },
  },
  {
    name: 'get_mutual_recognition',
    description: 'Retrieve mutual recognition agreements between two countries, optionally filtered by domain.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country_a: { type: 'string', description: 'First country ISO 3166-1 alpha-2 code (e.g., "BR")' },
        country_b: { type: 'string', description: 'Second country ISO 3166-1 alpha-2 code (e.g., "CL")' },
        domain: { type: 'string', description: 'Optional domain filter (e.g., "conformity_assessment", "professional_qualifications", "data_protection")' },
      },
      required: ['country_a', 'country_b'],
    },
  },
  {
    name: 'get_trade_bloc_rules',
    description: 'Retrieve rules, membership, and structure of a trade bloc (mercosur, pacific_alliance, or prosur).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        bloc: { type: 'string', enum: ['mercosur', 'pacific_alliance', 'prosur'], description: 'Trade bloc identifier' },
      },
      required: ['bloc'],
    },
  },
  {
    name: 'check_digital_trade_obligations',
    description: 'Check digital trade chapter requirements applicable to a set of countries.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        countries: { type: 'array', items: { type: 'string' }, description: 'Array of ISO 3166-1 alpha-2 country codes to check (e.g., ["BR", "AR", "CL"])' },
      },
      required: ['countries'],
    },
  },
  {
    name: 'list_sources',
    description: 'List all data sources with record counts, last fetch dates, and authority information.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'about',
    description: 'Return server metadata: version, tools, statistics, data sources, and disclaimer.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'check_data_freshness',
    description: 'Report per-source data age and flag stale sources.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
];

function handleToolCall(
  database: InstanceType<typeof Database>,
  name: string,
  args: Record<string, unknown>,
): unknown {
  switch (name) {
    case 'search_agreements':
      return searchAgreements(database, args as unknown as SearchAgreementsInput);
    case 'get_provision':
      return getProvision(database, args as unknown as GetProvisionInput);
    case 'get_data_transfer_rules':
      return getDataTransferRules(database, args as unknown as GetDataTransferRulesInput);
    case 'get_mutual_recognition':
      return getMutualRecognition(database, args as unknown as GetMutualRecognitionInput);
    case 'get_trade_bloc_rules':
      return getTradeBlocRules(database, args as unknown as GetTradeBlocRulesInput);
    case 'check_digital_trade_obligations':
      return checkDigitalTradeObligations(database, args as unknown as CheckDigitalTradeObligationsInput);
    case 'list_sources':
      return listSources(database);
    case 'about':
      return about(database);
    case 'check_data_freshness':
      return checkDataFreshness(database);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      protocol: 'mcp-streamable-http',
    });
    return;
  }

  try {
    if (!existsSync(SOURCE_DB) && !existsSync(TMP_DB)) {
      res.status(500).json({ error: `Database not found at ${SOURCE_DB}` });
      return;
    }

    const database = getDatabase();

    const server = new Server(
      { name: SERVER_NAME, version: SERVER_VERSION },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        const result = handleToolCall(database, name, args ?? {});
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('MCP handler error:', message);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
}
