import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from '../../src/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'database.db');

let instance: ReturnType<typeof createServer>;

beforeAll(() => {
  instance = createServer(DB_PATH);
});

afterAll(() => {
  instance.close();
});

describe('about', () => {
  it('returns server name and version', () => {
    const result = instance.callTool('about', {}) as any;
    expect(result.name).toBe('mercosur-trade-mcp');
    expect(result.version).toBe('0.1.0');
  });

  it('lists 3 trade blocs', () => {
    const result = instance.callTool('about', {}) as any;
    expect(result.blocs).toHaveLength(3);
    const blocIds = result.blocs.map((b: any) => b.id);
    expect(blocIds).toContain('mercosur');
    expect(blocIds).toContain('pacific_alliance');
    expect(blocIds).toContain('prosur');
  });

  it('reports non-zero statistics', () => {
    const result = instance.callTool('about', {}) as any;
    expect(result.statistics.agreements).toBeGreaterThan(0);
    expect(result.statistics.provisions).toBeGreaterThan(0);
    expect(result.statistics.trade_blocs).toBeGreaterThan(0);
  });

  it('lists all 9 tools', () => {
    const result = instance.callTool('about', {}) as any;
    expect(result.tools).toHaveLength(9);
    expect(result.tools).toContain('search_agreements');
    expect(result.tools).toContain('get_provision');
    expect(result.tools).toContain('about');
  });

  it('includes publisher and license', () => {
    const result = instance.callTool('about', {}) as any;
    expect(result.publisher).toBe('Ansvar Systems AB');
    expect(result.license).toBe('Apache-2.0');
  });

  it('includes _metadata in response', () => {
    const result = instance.callTool('about', {}) as any;
    expect(result._metadata).toBeDefined();
  });
});

describe('list_sources', () => {
  it('returns sources with item counts', () => {
    const result = instance.callTool('list_sources', {}) as any;
    expect(result.sources.length).toBe(4);
    for (const source of result.sources) {
      expect(source).toHaveProperty('id');
      expect(source).toHaveProperty('full_name');
    }
  });

  it('returns accurate totals', () => {
    const result = instance.callTool('list_sources', {}) as any;
    expect(result.totals.trade_blocs).toBeGreaterThan(0);
    expect(result.totals.agreements).toBeGreaterThan(0);
    expect(result.totals.provisions).toBeGreaterThan(0);
  });
});

describe('check_data_freshness', () => {
  it('returns freshness data with stale threshold', () => {
    const result = instance.callTool('check_data_freshness', {}) as any;
    expect(result.stale_threshold_days).toBe(90);
    expect(result.total_sources).toBe(4);
    expect(result.sources).toHaveLength(4);
    expect(result.blocs).toBeDefined();
    expect(result.blocs.length).toBeGreaterThan(0);
  });
});

describe('MCP protocol', () => {
  it('createServer returns server, db, getTools, callTool, close', () => {
    expect(instance.server).toBeDefined();
    expect(instance.db).toBeDefined();
    expect(instance.getTools).toBeTypeOf('function');
    expect(instance.callTool).toBeTypeOf('function');
    expect(instance.close).toBeTypeOf('function');
  });

  it('getTools returns 9 tool definitions', () => {
    const tools = instance.getTools();
    expect(tools).toHaveLength(9);
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it('callTool throws for unknown tool', () => {
    expect(() => instance.callTool('nonexistent_tool', {})).toThrow('Unknown tool');
  });
});
