export type FeatureRequestStatus = 'pending' | 'reviewed' | 'done';
export type FeatureRequest = { id: number; title: string; content: string; status: FeatureRequestStatus; createdAt: string; commentCount: number };
export type FeatureRequestComment = { id: number; authorRole: string; authorUsername: string | null; authorDisplayName: string | null; authorGaName: string | null; authorId: string; createdAt: string; content: string };
