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

describe('get_trade_bloc_rules', () => {
  it('returns Mercosur bloc with members and agreements', () => {
    const result = instance.callTool('get_trade_bloc_rules', {
      bloc: 'mercosur',
    }) as any;
    expect(result.found).toBe(true);
    expect(result.bloc.id).toBe('mercosur');
    expect(result.bloc.name).toBe('Mercosur');
    expect(result.bloc.members.length).toBeGreaterThan(0);
    expect(result.agreements.count).toBeGreaterThan(0);
    expect(result.provisions_count).toBeGreaterThan(0);
  });

  it('returns Pacific Alliance bloc', () => {
    const result = instance.callTool('get_trade_bloc_rules', {
      bloc: 'pacific_alliance',
    }) as any;
    expect(result.found).toBe(true);
    expect(result.bloc.id).toBe('pacific_alliance');
    expect(result.bloc.name).toBe('Pacific Alliance');
  });

  it('returns PROSUR bloc', () => {
    const result = instance.callTool('get_trade_bloc_rules', {
      bloc: 'prosur',
    }) as any;
    expect(result.found).toBe(true);
    expect(result.bloc.id).toBe('prosur');
  });

  it('returns not-found for unknown bloc', () => {
    const result = instance.callTool('get_trade_bloc_rules', {
      bloc: 'nonexistent_bloc',
    }) as any;
    expect(result.found).toBe(false);
    expect(result.message).toContain('Unknown trade bloc');
  });

  it('includes member details with country names', () => {
    const result = instance.callTool('get_trade_bloc_rules', {
      bloc: 'mercosur',
    }) as any;
    for (const member of result.bloc.members) {
      expect(member.code).toBeTruthy();
      expect(member.name).toBeTruthy();
    }
  });
});
