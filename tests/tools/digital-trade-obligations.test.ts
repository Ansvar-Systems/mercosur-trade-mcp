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

describe('check_digital_trade_obligations', () => {
  it('returns obligations for Brazil', () => {
    const result = instance.callTool('check_digital_trade_obligations', {
      countries: ['BR'],
    }) as any;
    expect(result.found).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    expect(result.obligations.length).toBe(result.count);
  });

  it('returns obligations for multiple countries', () => {
    const result = instance.callTool('check_digital_trade_obligations', {
      countries: ['BR', 'AR'],
    }) as any;
    expect(result.found).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    expect(result.countries).toHaveLength(2);
  });

  it('returns not-found for empty countries array', () => {
    const result = instance.callTool('check_digital_trade_obligations', {
      countries: [],
    }) as any;
    expect(result.found).toBe(false);
    expect(result.message).toContain('At least one country');
  });

  it('returns not-found for countries with no obligations', () => {
    const result = instance.callTool('check_digital_trade_obligations', {
      countries: ['ZZ'],
    }) as any;
    expect(result.found).toBe(false);
  });

  it('includes country names in response', () => {
    const result = instance.callTool('check_digital_trade_obligations', {
      countries: ['BR'],
    }) as any;
    expect(result.countries[0].code).toBe('BR');
    expect(result.countries[0].name).toBe('Brazil');
  });

  it('each obligation has expected fields', () => {
    const result = instance.callTool('check_digital_trade_obligations', {
      countries: ['BR'],
    }) as any;
    for (const obligation of result.obligations) {
      expect(obligation).toHaveProperty('obligation');
      expect(obligation).toHaveProperty('countries');
    }
  });
});
