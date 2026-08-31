export type TeamMember = {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  teamId: string | null;
};

export type TeamMembersResult = {
  teamId: string | null;
  teamName: string | null;
  ownerId: string | null;
  teamActive: boolean;
  teamStorageUsedBytes: number;
  teamStorageLimitBytes: number;
  members: TeamMember[];
};

export type TeamPostAttachment = {
  id: string;
  fileUrl: string;
  fileName: string;
};

export type TeamPost = {
  id: string;
  title: string;
  content: string;
  isNotice: boolean;
  createdAt: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  attachments: TeamPostAttachment[];
};

export type TeamPostsResult = {
  teamId: string;
  ownerId: string | null;
  page: number;
  limit: number;
  hasNext: boolean;
  posts: TeamPost[];
};

export type TeamPostComment = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
};

export type TeamFile = {
  id: string;
  fileUrl: string;
  fileName: string;
  postId: string;
  postTitle: string;
  postCreatedAt: string;
};
