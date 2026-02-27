import type { VercelRequest, VercelResponse } from '@vercel/node';

const SERVER_NAME = 'mercosur-trade-mcp';
const VERSION = '0.1.0';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const info = {
    status: 'ok',
    server: SERVER_NAME,
    version: VERSION,
    git_sha: process.env['VERCEL_GIT_COMMIT_SHA']?.substring(0, 7) || 'unknown',
    uptime_seconds: Math.floor(process.uptime()),
    build_timestamp: process.env['VERCEL_DEPLOYMENT_CREATED_AT'] || 'unknown',
    data_freshness: {
      last_ingested: 'pending',
      source_count: 4,
    },
    capabilities: [
      'mercosur',
      'pacific_alliance',
      'prosur',
      'bilateral',
      'data_transfer',
      'mutual_recognition',
      'digital_trade',
    ],
    tier: 'free',
  };

  if (req.url?.includes('/version')) {
    return res.status(200).json({
      ...info,
      node_version: process.version,
      transport: ['stdio', 'streamable-http'],
      mcp_sdk_version: '1.12.1',
      repo_url: 'https://github.com/Ansvar-Systems/mercosur-trade-mcp',
      report_issue_url: 'https://github.com/Ansvar-Systems/mercosur-trade-mcp/issues/new',
    });
  }

  return res.status(200).json(info);
}
