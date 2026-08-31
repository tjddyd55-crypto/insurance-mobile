export const teamQueryKeys = {
  members: ['team', 'members'] as const,
  posts: ['team', 'posts'] as const,
  comments: (postId: string) => ['team', 'posts', postId, 'comments'] as const,
  files: ['team', 'files'] as const,
};
