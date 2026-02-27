import { toIsoDate } from '../tools/common.js';

export interface ResponseMeta {
  disclaimer: string;
  data_age: string;
  server: string;
  version: string;
}

const DISCLAIMER =
  'Reference tool only. Not legal or trade advice. Verify against official treaty texts and consult qualified trade counsel.';

export function buildMeta(overrides?: Partial<ResponseMeta>): ResponseMeta {
  return {
    disclaimer: DISCLAIMER,
    data_age: toIsoDate(),
    server: 'mercosur-trade-mcp',
    version: '0.1.0',
    ...overrides,
  };
}
