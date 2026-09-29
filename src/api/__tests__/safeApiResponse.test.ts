import { safeApiResponse } from '../../api/safeApiResponse';

describe('safeApiResponse', () => {
  it('unwraps data-only envelopes', () => {
    expect(safeApiResponse({ data: { ok: true } })).toEqual({ ok: true });
  });

  it('keeps body when sibling keys exist', () => {
    expect(safeApiResponse({ data: [1], total: 1 })).toEqual({ data: [1], total: 1 });
  });

  it('returns empty array on error envelope', () => {
    expect(safeApiResponse({ error: 'boom' })).toEqual([]);
  });
});
