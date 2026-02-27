import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel serverless endpoint for Mercosur Trade MCP.
 *
 * Handles MCP JSON-RPC requests over Streamable HTTP.
 *
 * NOTE: Before deploying to Vercel, replace better-sqlite3 with
 * @ansvar/mcp-sqlite (WASM-based) in the database loader below.
 * better-sqlite3 is a native C++ addon that cannot run on Vercel.
 */

const SERVER_NAME = 'mercosur-trade-mcp';
const VERSION = '0.1.0';

// Placeholder — tool definitions will be imported from src/tools once
// the build pipeline includes API compilation.
const TOOL_COUNT = 9;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — transport info
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      server: SERVER_NAME,
      version: VERSION,
      transport: 'streamable-http',
      tools: TOOL_COUNT,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;
  if (!body || !body.method) {
    return res.status(400).json({ error: 'Invalid JSON-RPC request' });
  }

  try {
    if (body.method === 'initialize') {
      return res.status(200).json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: SERVER_NAME, version: VERSION },
        },
      });
    }

    if (body.method === 'tools/list') {
      // TODO: import TOOLS from compiled source
      return res.status(200).json({
        jsonrpc: '2.0',
        id: body.id,
        result: { tools: [] },
      });
    }

    if (body.method === 'tools/call') {
      // TODO: wire up tool routing via handleToolCall
      return res.status(200).json({
        jsonrpc: '2.0',
        id: body.id,
        error: {
          code: -32603,
          message: 'Tool routing not yet wired for Vercel deployment.',
        },
      });
    }

    return res.status(200).json({
      jsonrpc: '2.0',
      id: body.id,
      error: { code: -32601, message: `Method not found: ${body.method}` },
    });
  } catch (error) {
    return res.status(200).json({
      jsonrpc: '2.0',
      id: body?.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
