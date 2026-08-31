import type { LocalAttachment } from './types';
export const MAX_NEWS_FILE_BYTES = 10 * 1024 * 1024;
export function attachmentKind(mime = ''): 'image' | 'file' { return mime.toLowerCase().startsWith('image/') ? 'image' : 'file'; }
export function validateNewsAttachment(file: Pick<LocalAttachment, 'mimeType' | 'size'>): string | null { const mime = file.mimeType || ''; if (!mime.startsWith('image/') && mime !== 'application/pdf') return '이미지 또는 PDF 파일만 첨부할 수 있습니다.'; if ((file.size ?? 0) > MAX_NEWS_FILE_BYTES) return '첨부파일은 10MB 이하만 업로드할 수 있습니다.'; return null; }
export function newsScopeLabel(scope: 'all' | 'personal', customerName = ''): string { return scope === 'all' ? '전체 고객' : customerName || '개인 고객'; }
