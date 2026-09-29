import { getTeamFiles, getTeamMembers, getTeamPosts } from '../teamApi';

describe('teamApi missing-team compatibility', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockMissingTeam() {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: '팀에 소속되어 있지 않습니다' }),
    }) as typeof fetch;
  }

  test('normalizes members endpoint 400 to an empty membership', async () => {
    mockMissingTeam();
    await expect(getTeamMembers('token')).resolves.toMatchObject({ teamId: null, members: [] });
  });

  test('normalizes posts endpoint 400 to an empty team feed', async () => {
    mockMissingTeam();
    await expect(getTeamPosts('token')).resolves.toEqual({
      teamId: '', ownerId: null, page: 1, limit: 100, hasNext: false, posts: [],
    });
  });

  test('normalizes files endpoint 400 to an empty file list', async () => {
    mockMissingTeam();
    await expect(getTeamFiles('token')).resolves.toEqual([]);
  });

  test('keeps unrelated 400 errors visible', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: '팀 정보를 찾을 수 없습니다.' }),
    }) as typeof fetch;
    await expect(getTeamMembers('token')).rejects.toMatchObject({ status: 400 });
  });
});
