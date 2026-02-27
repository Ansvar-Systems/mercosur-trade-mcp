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

describe('get_data_transfer_rules', () => {
  it('returns data transfer rules between AR and EU', () => {
    const result = instance.callTool('get_data_transfer_rules', {
      source_country: 'AR',
      dest_country: 'EU',
    }) as any;
    expect(result.found).toBe(true);
    expect(result.source_country).toBe('AR');
    expect(result.dest_country).toBe('EU');
    expect(result.rules).toBeDefined();
  });

  it('returns data transfer rules between AR and PY', () => {
    const result = instance.callTool('get_data_transfer_rules', {
      source_country: 'AR',
      dest_country: 'PY',
    }) as any;
    expect(result.found).toBe(true);
    expect(result.rules).toBeDefined();
  });

  it('returns not-found for countries with no transfer rules', () => {
    const result = instance.callTool('get_data_transfer_rules', {
      source_country: 'ZZ',
      dest_country: 'YY',
    }) as any;
    expect(result.found).toBe(false);
    expect(result.message).toContain('No data transfer rules found');
  });

  it('supports reverse lookup', () => {
    // AR->UY should exist; checking UY->AR should find it via reverse
    const forward = instance.callTool('get_data_transfer_rules', {
      source_country: 'AR',
      dest_country: 'UY',
    }) as any;

    if (forward.found) {
      const reverse = instance.callTool('get_data_transfer_rules', {
        source_country: 'UY',
        dest_country: 'AR',
      }) as any;
      expect(reverse.found).toBe(true);
    }
  });

  it('includes country names in response', () => {
    const result = instance.callTool('get_data_transfer_rules', {
      source_country: 'AR',
      dest_country: 'EU',
    }) as any;
    expect(result.source_country_name).toBe('Argentina');
  });

  it('includes _metadata in response', () => {
    const result = instance.callTool('get_data_transfer_rules', {
      source_country: 'AR',
      dest_country: 'EU',
    }) as any;
    expect(result._metadata).toBeDefined();
  });
});
