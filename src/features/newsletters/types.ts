export type NewsChannel = 'INSURER' | 'LOSS_ADJUSTER';
export type NewsletterBoard = {
  label: string;
  slug: string;
  boardScope: 'global' | 'ga';
  systemKey?: string | null;
  isActive?: boolean;
};
export type InsurerSummary = { insurerCode: string; insurerName: string; insurerSlug: string; gaCode: string; newsletterCount: number; lastPublishedAt: string | null };
export type NewsletterAttachment = {
  id: string;
  kind: 'image' | 'file';
  url: string;
  openUrl?: string;
  fileName: string;
  sortOrder: number;
  objectKey?: string;
  mimeType?: string;
  size?: number;
};
export type NewsletterItem = {
  id: string;
  gaCode: string;
  insurerCode: string;
  insurerName: string;
  insurerSlug: string;
  boardLabel?: string;
  authorName?: string;
  authorOrganizationName?: string;
  authorDisplayName?: string;
  title: string;
  summary: string;
  heroImageUrl: string | null;
  heroImageObjectKey?: string | null;
  heroImageOpenUrl?: string | null;
  publishedAt: string;
  status: 'DRAFT' | 'PUBLISHED';
  imageCount?: number;
  fileCount?: number;
  hasImages: boolean;
  hasPdf: boolean;
  hasTextBody: boolean;
};
export type NewsletterLinkPreview = {
  url: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  siteName?: string | null;
  domain?: string | null;
};
export type NewsletterDetail = NewsletterItem & {
  bodyText: string;
  attachments: NewsletterAttachment[];
  linkPreview?: NewsletterLinkPreview | null;
};
export type NewsletterFeed = { newsletters: NewsletterItem[]; insurers: InsurerSummary[] };
