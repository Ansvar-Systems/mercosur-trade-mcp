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

describe('get_provision', () => {
  it('retrieves a valid provision from Treaty of Asuncion', () => {
    const result = instance.callTool('get_provision', {
      agreement_id: 'ace-35-mercosur-chile',
      article: '1',
    }) as any;
    expect(result.found).toBe(true);
    expect(result.provision).toBeDefined();
    expect(result.provision.agreement_id).toBe('ace-35-mercosur-chile');
    expect(result.provision.content).toBeTruthy();
  });

  it('returns not-found for non-existent provision', () => {
    const result = instance.callTool('get_provision', {
      agreement_id: 'treaty-of-asuncion',
      article: 'nonexistent-99999',
    }) as any;
    expect(result.found).toBe(false);
    expect(result.message).toContain('No provision found');
  });

  it('returns not-found for non-existent agreement', () => {
    const result = instance.callTool('get_provision', {
      agreement_id: 'nonexistent-agreement',
      article: '1',
    }) as any;
    expect(result.found).toBe(false);
  });

  it('includes _metadata in response', () => {
    const result = instance.callTool('get_provision', {
      agreement_id: 'ace-35-mercosur-chile',
      article: '1',
    }) as any;
    expect(result._metadata).toBeDefined();
  });
});
