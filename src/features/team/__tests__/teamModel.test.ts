import { formatStorageBytes, normalizeTeamMembers } from '../teamModel';

describe('teamModel', () => {
  test('normalizes team and member snake_case fields', () => {
    const result = normalizeTeamMembers({
      team_id: 't1', team_name: '강남팀', owner_id: 'u1', team_active: true,
      members: [{ user_id: 'u1', username: 'owner', display_name: '팀장' }],
    });
    expect(result.teamId).toBe('t1');
    expect(result.ownerId).toBe('u1');
    expect(result.members[0].displayName).toBe('팀장');
  });

  test('formats storage usage units', () => {
    expect(formatStorageBytes(1024)).toBe('1.0 KB');
    expect(formatStorageBytes(1024 ** 2)).toBe('1.0 MB');
  });
});
