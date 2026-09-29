import { describe, expect, it } from 'vitest';
import { PRODUCTION_FRONTEND_URL, resolveCorsOrigins, resolveFrontendUrl } from '../../src/config/env';

describe('frontend e CORS por ambiente', () => {
  it('usa o domínio oficial quando FRONTEND_URL não existe em produção', () => {
    expect(resolveFrontendUrl(undefined, 'production')).toBe(PRODUCTION_FRONTEND_URL);
  });

  it('sempre permite o frontend oficial em produção e normaliza origens adicionais', () => {
    expect(resolveCorsOrigins('https://admin.example.com/', 'https://custom.example.com/', 'production')).toEqual([
      'https://custom.example.com',
      PRODUCTION_FRONTEND_URL,
      'https://admin.example.com',
    ]);
  });

  it('mantém localhost restrito ao desenvolvimento', () => {
    expect(resolveCorsOrigins(undefined, 'http://localhost:5173', 'development')).toEqual(['http://localhost:5173']);
  });
});
