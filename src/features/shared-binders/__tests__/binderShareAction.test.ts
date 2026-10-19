import { ApiError, apiRequest } from '../../../api/client';
import { normalizeBinderShareStatus } from '../sharedBinderModel';
import { getBinderShareStatus, revokeBinderShare, shareBinderToGa, sharedBinderPaths } from '../sharedBindersApi';
import { sharedBinderQueryKeys } from '../queryKeys';

jest.mock('../../../api/client', () => {
  const actual = jest.requireActual('../../../api/client');
  return { ...actual, apiRequest: jest.fn() };
});

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string; readdirSync: (dir: string) => string[] }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const repo = (...parts: string[]) => path.join(__dirname, '..', '..', '..', '..', ...parts);
const read = (...parts: string[]) => fs.readFileSync(repo(...parts), 'utf8');
const mocked = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('native 내 바인더 share action (existing web share API, server SSOT)', () => {
  beforeEach(() => mocked.mockReset());

  it('uses exactly the web share endpoints', () => {
    expect(sharedBinderPaths.shareStatus('7')).toBe('/api/personal-binders/7/share-status');
    expect(sharedBinderPaths.shareToGa('7')).toBe('/api/personal-binders/7/share');
    expect(sharedBinderPaths.revoke('4')).toBe('/api/personal-binders/shared/4');
    expect(sharedBinderQueryKeys.shareStatus('7')).toEqual(['shared-binders', 'share-status', '7']);
  });

  it('normalizes share-status: active only when a shareId is present and status is active', () => {
    expect(normalizeBinderShareStatus({ active: null })).toEqual({ active: null });
    expect(normalizeBinderShareStatus({})).toEqual({ active: null });
    expect(normalizeBinderShareStatus({ active: { shareId: 4, title: 'T', createdAt: 'x', status: 'revoked' } })).toEqual({ active: null });
    expect(normalizeBinderShareStatus({ active: { shareId: 4, title: 'T', createdAt: '2026-10-19', status: 'active' } }))
      .toEqual({ active: { shareId: '4', title: 'T', createdAt: '2026-10-19' } });
  });

  it('share ON: re-reads server state, POSTs once, then returns the server state', async () => {
    mocked
      .mockResolvedValueOnce({ active: null })
      .mockResolvedValueOnce({ id: '9' })
      .mockResolvedValueOnce({ active: { shareId: '9', title: 'B', createdAt: null, status: 'active' } });
    await expect(shareBinderToGa('tok', '7')).resolves.toEqual({ active: { shareId: '9', title: 'B', createdAt: null } });
    expect(mocked.mock.calls.map(([url, init]) => [url, (init as { method?: string }).method ?? 'GET'])).toEqual([
      ['/api/personal-binders/7/share-status', 'GET'],
      ['/api/personal-binders/7/share', 'POST'],
      ['/api/personal-binders/7/share-status', 'GET'],
    ]);
  });

  it('share ON when the server already shares it does not create a second share', async () => {
    mocked.mockResolvedValueOnce({ active: { shareId: '9', title: 'B', createdAt: null, status: 'active' } });
    await expect(shareBinderToGa('tok', '7')).resolves.toEqual({ active: { shareId: '9', title: 'B', createdAt: null } });
    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it('share OFF uses DELETE on the share id; errors surface (no local-only state)', async () => {
    mocked.mockResolvedValueOnce({ ok: true });
    await revokeBinderShare('tok', '9');
    expect(mocked).toHaveBeenCalledWith('/api/personal-binders/shared/9', expect.objectContaining({ method: 'DELETE', token: 'tok' }));
    mocked.mockRejectedValueOnce(new ApiError('공유 해제 권한이 없습니다.', 403));
    await expect(revokeBinderShare('tok', '9')).rejects.toThrow('공유 해제 권한이 없습니다.');
    await expect(getBinderShareStatus(null, '7')).rejects.toThrow('로그인이 필요합니다.');
  });

  it('places the action in ONE location (바인더 편집 header right) with a11y label and 44pt target', () => {
    const action = read('src', 'features', 'personal-binders', 'BinderShareAction.tsx');
    expect(action).toContain("a11yOff: '공유'");
    expect(action).toContain('size="md"');
    expect(action).toContain("'바인더가 공유되었습니다.'");
    expect(action).not.toMatch(/useState<boolean>\(.*shared/i);
    const dirs = [['src', 'features', 'personal-binders'], ['src', 'features', 'shared-binders']];
    const users = dirs.flatMap((dir) => fs.readdirSync(repo(...dir)).filter((name) => name.endsWith('.tsx'))
      .filter((name) => read(...dir, name).includes('<BinderShareAction')).map((name) => name));
    expect(users).toEqual(['BinderEditorScreen.tsx']);
    const editor = read('src', 'features', 'personal-binders', 'BinderEditorScreen.tsx');
    expect(editor).toMatch(/rightAction=\{\s*<BinderShareAction/);
    expect(read('src', 'features', 'personal-binders', 'BinderViewerScreen.tsx')).not.toContain('BinderShareAction');
  });
});
