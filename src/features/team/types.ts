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
