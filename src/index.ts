#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from '@ansvar/mcp-sqlite';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { searchAgreements, type SearchAgreementsInput } from './tools/search-agreements.js';
import { getProvision, type GetProvisionInput } from './tools/get-provision.js';
import { getDataTransferRules, type GetDataTransferRulesInput } from './tools/data-transfer-rules.js';
import { getMutualRecognition, type GetMutualRecognitionInput } from './tools/mutual-recognition.js';
import { getTradeBlocRules, type GetTradeBlocRulesInput } from './tools/trade-bloc-rules.js';
import { checkDigitalTradeObligations, type CheckDigitalTradeObligationsInput } from './tools/digital-trade-obligations.js';
import { listSources } from './tools/list-sources.js';
import { about } from './tools/about.js';
import { checkDataFreshness } from './tools/check-data-freshness.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SERVER_NAME = 'mercosur-trade-mcp';
const VERSION = '0.1.0';
const DB_ENV_VAR = 'MERCOSUR_TRADE_DB_PATH';

const TOOLS = [
  {
    name: 'search_agreements',
    description:
      'Full-text search across Mercosur, Pacific Alliance, PROSUR, and bilateral trade agreements. Returns matching provisions with relevance ranking.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "data localization", "digital services", "customs union")',
        },
        countries: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by party countries using ISO 3166-1 alpha-2 codes (e.g., ["BR", "AR"])',
        },
        topic: {
          type: 'string',
          description:
            'Filter by topic (e.g., "data_transfer", "digital_trade", "customs", "investment", "services")',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 10, max 50)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description:
      'Retrieve a single provision (article) from a trade agreement by agreement ID and article reference.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agreement_id: {
          type: 'string',
          description: 'Agreement identifier (e.g., "treaty-of-asuncion", "pa-framework-agreement")',
        },
        article: {
          type: 'string',
          description: 'Article reference (e.g., "1", "12.3", "Annex I")',
        },
      },
      required: ['agreement_id', 'article'],
    },
  },
  {
    name: 'get_data_transfer_rules',
    description:
      'Retrieve bilateral data transfer framework between two countries, including adequacy status, transfer mechanisms, and restrictions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        source_country: {
          type: 'string',
          description: 'Source country ISO 3166-1 alpha-2 code (e.g., "BR")',
        },
        dest_country: {
          type: 'string',
          description: 'Destination country ISO 3166-1 alpha-2 code (e.g., "AR")',
        },
      },
      required: ['source_country', 'dest_country'],
    },
  },
  {
    name: 'get_mutual_recognition',
    description:
      'Retrieve mutual recognition agreements between two countries, optionally filtered by domain (e.g., "conformity_assessment", "professional_qualifications", "data_protection").',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country_a: {
          type: 'string',
          description: 'First country ISO 3166-1 alpha-2 code (e.g., "BR")',
        },
        country_b: {
          type: 'string',
          description: 'Second country ISO 3166-1 alpha-2 code (e.g., "CL")',
        },
        domain: {
          type: 'string',
          description:
            'Optional domain filter (e.g., "conformity_assessment", "professional_qualifications", "data_protection", "standards")',
        },
      },
      required: ['country_a', 'country_b'],
    },
  },
  {
    name: 'get_trade_bloc_rules',
    description:
      'Retrieve rules, membership, and structure of a trade bloc (mercosur, pacific_alliance, or prosur).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        bloc: {
          type: 'string',
          enum: ['mercosur', 'pacific_alliance', 'prosur'],
          description: 'Trade bloc identifier',
        },
      },
      required: ['bloc'],
    },
  },
  {
    name: 'check_digital_trade_obligations',
    description:
      'Check digital trade chapter requirements applicable to a set of countries. Returns obligations from e-commerce chapters, digital trade frameworks, and data flow provisions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        countries: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Array of ISO 3166-1 alpha-2 country codes to check (e.g., ["BR", "AR", "CL"])',
        },
      },
      required: ['countries'],
    },
  },
  {
    name: 'list_sources',
    description: 'List all data sources with record counts, last fetch dates, and authority information.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'about',
    description:
      'Return server metadata: version, tools, statistics, data sources, and disclaimer.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'check_data_freshness',
    description:
      'Report per-source data age and flag stale sources. Use this to verify data currency before relying on results.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

export function createServer(dbPath?: string) {
  const resolvedPath =
    dbPath ?? process.env[DB_ENV_VAR] ?? join(__dirname, '..', 'data', 'database.db');
  const db = new Database(resolvedPath, { readonly: true });

  const server = new Server(
    { name: SERVER_NAME, version: VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = handleToolCall(db, name, (args ?? {}) as Record<string, unknown>);
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

  return {
    server,
    db,
    getTools: () => TOOLS,
    callTool: (name: string, args: Record<string, unknown>) => handleToolCall(db, name, args),
    close: () => db.close(),
  };
}

function handleToolCall(
  db: InstanceType<typeof Database>,
  name: string,
  args: Record<string, unknown>,
): unknown {
  switch (name) {
    case 'search_agreements':
      return searchAgreements(db, args as unknown as SearchAgreementsInput);
    case 'get_provision':
      return getProvision(db, args as unknown as GetProvisionInput);
    case 'get_data_transfer_rules':
      return getDataTransferRules(db, args as unknown as GetDataTransferRulesInput);
    case 'get_mutual_recognition':
      return getMutualRecognition(db, args as unknown as GetMutualRecognitionInput);
    case 'get_trade_bloc_rules':
      return getTradeBlocRules(db, args as unknown as GetTradeBlocRulesInput);
    case 'check_digital_trade_obligations':
      return checkDigitalTradeObligations(db, args as unknown as CheckDigitalTradeObligationsInput);
    case 'list_sources':
      return listSources(db);
    case 'about':
      return about(db);
    case 'check_data_freshness':
      return checkDataFreshness(db);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Graceful shutdown
function shutdown() {
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Main entry point (stdio mode)
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') || process.argv[1].endsWith('index.ts'));

if (isMain) {
  const instance = createServer();
  const transport = new StdioServerTransport();
  instance.server.connect(transport).catch((err) => {
    console.error('Failed to connect:', err);
    process.exit(1);
  });
}
