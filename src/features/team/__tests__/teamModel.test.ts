import {
  canEditTeamPost,
  formatStorageBytes,
  normalizeTeamComment,
  normalizeTeamFile,
  normalizeTeamMembers,
  normalizeTeamPosts,
} from '../teamModel';

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

  test('normalizes posts, comments, and files from the operating API contract', () => {
    const posts = normalizeTeamPosts({
      teamId: 't1', ownerId: 'owner', hasNext: true,
      posts: [{ id: 'p1', title: '공지', content: '내용', isNotice: true, authorId: 'u1', attachments: [{ id: 'a1', fileUrl: 'https://cdn/a', fileName: 'a.pdf' }] }],
    });
    expect(posts.posts[0]).toMatchObject({ id: 'p1', isNotice: true });
    expect(posts.posts[0].attachments[0].fileName).toBe('a.pdf');
    expect(normalizeTeamComment({ id: 'c1', post_id: 'p1', content: '확인' }).postId).toBe('p1');
    expect(normalizeTeamFile({ id: 'f1', file_url: 'https://cdn/f', file_name: '자료.pdf', post_id: 'p1' }).fileName).toBe('자료.pdf');
  });

  test('allows post editing for author, team owner, and elevated roles only', () => {
    const post = normalizeTeamPosts({ posts: [{ id: 'p1', authorId: 'author' }] }).posts[0];
    expect(canEditTeamPost(post, 'author', null, 'USER')).toBe(true);
    expect(canEditTeamPost(post, 'owner', 'owner', 'USER')).toBe(true);
    expect(canEditTeamPost(post, 'admin', null, 'GA_ADMIN')).toBe(true);
    expect(canEditTeamPost(post, 'other', 'owner', 'USER')).toBe(false);
  });
});
