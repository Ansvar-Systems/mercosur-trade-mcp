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

describe('get_mutual_recognition', () => {
  it('returns mutual recognition agreements between BR and AR', () => {
    const result = instance.callTool('get_mutual_recognition', {
      country_a: 'BR',
      country_b: 'AR',
    }) as any;
    expect(result.found).toBe(true);
    expect(result.country_a).toBe('BR');
    expect(result.country_b).toBe('AR');
    expect(result.count).toBeGreaterThan(0);
    expect(result.agreements.length).toBe(result.count);
  });

  it('filters by domain when provided', () => {
    const result = instance.callTool('get_mutual_recognition', {
      country_a: 'BR',
      country_b: 'AR',
      domain: 'customs_procedures',
    }) as any;
    expect(result.found).toBe(true);
    expect(result.domain).toBe('customs_procedures');
    for (const agreement of result.agreements) {
      expect(agreement.domain).toBe('customs_procedures');
    }
  });

  it('returns not-found when no agreements exist between countries', () => {
    const result = instance.callTool('get_mutual_recognition', {
      country_a: 'ZZ',
      country_b: 'YY',
    }) as any;
    expect(result.found).toBe(false);
    expect(result.message).toContain('No mutual recognition agreements found');
  });

  it('includes country names in response', () => {
    const result = instance.callTool('get_mutual_recognition', {
      country_a: 'BR',
      country_b: 'AR',
    }) as any;
    expect(result.country_a_name).toBe('Brazil');
    expect(result.country_b_name).toBe('Argentina');
  });

  it('includes _metadata in response', () => {
    const result = instance.callTool('get_mutual_recognition', {
      country_a: 'BR',
      country_b: 'AR',
    }) as any;
    expect(result._metadata).toBeDefined();
  });
});
