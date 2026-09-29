export type NewsAttachment = { id?: string; kind: 'image' | 'file'; url: string; fileName: string; sortOrder: number; objectKey?: string; mimeType?: string; size?: number };
export type DraftAttachment = {
  key: string;
  kind: 'image' | 'file';
  fileName: string;
  sortOrder: number;
  mimeType?: string;
  size?: number;
  url?: string;
  objectKey?: string;
  id?: string;
  localUri?: string;
};
export type CustomerNewsItem = { id: string; title: string; content: string; updatedAt: string | null; isPinned: boolean; heroImageUrl?: string | null; attachments?: NewsAttachment[]; scope: 'all' | 'personal'; targetCustomerId: number | null; targetCustomerName: string };
export type LinkedCustomer = { customerId: number; customerName: string; lastConnectedAt: string | null; deviceCount: number };
export type NewsComment = { id: string; newsId: string; authorType: 'agent' | 'customer'; authorName: string; content: string; createdAt: string | null };
export type LocalAttachment = { uri: string; name: string; mimeType?: string | null; size?: number; kind: 'image' | 'file' };
export type CustomerNewsPreviewDraft = {
  content: string;
  attachments: NewsAttachment[];
  isPinned: boolean;
};
