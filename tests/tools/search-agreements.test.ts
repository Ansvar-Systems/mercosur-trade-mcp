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

describe('search_agreements', () => {
  it('returns results when searching "comercio"', () => {
    const result = instance.callTool('search_agreements', { query: 'comercio' }) as any;
    expect(result.count).toBeGreaterThan(0);
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('filters by countries', () => {
    const result = instance.callTool('search_agreements', {
      query: 'commerce',
      countries: ['BR'],
    }) as any;
    // Post-filtered results should only contain agreements involving BR
    for (const row of result.results) {
      expect(String(row.parties)).toContain('BR');
    }
  });

  it('filters by topic', () => {
    const result = instance.callTool('search_agreements', {
      query: 'data',
      topic: 'data_transfer',
    }) as any;
    for (const row of result.results) {
      expect(row.topic).toBe('data_transfer');
    }
  });

  it('caps results at the specified limit', () => {
    const result = instance.callTool('search_agreements', {
      query: 'trade',
      limit: 3,
    }) as any;
    expect(result.results.length).toBeLessThanOrEqual(3);
  });

  it('returns clean message for empty query', () => {
    const result = instance.callTool('search_agreements', { query: '' }) as any;
    expect(result.count).toBe(0);
    expect(result.message).toContain('empty');
  });

  it('handles special characters in query', () => {
    const result = instance.callTool('search_agreements', { query: '***!!!###' }) as any;
    expect(result.count).toBe(0);
    expect(result.message).toContain('special characters');
  });

  it('includes _metadata in response', () => {
    const result = instance.callTool('search_agreements', { query: 'customs' }) as any;
    expect(result._metadata).toBeDefined();
    expect(result._metadata.disclaimer).toBeTruthy();
  });
});
