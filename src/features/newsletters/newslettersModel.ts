import type { NewsletterItem } from './types';
export function sortPublishedNews(rows: NewsletterItem[]): NewsletterItem[] { return [...rows].filter((row) => row.status === 'PUBLISHED').sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()); }
export function formatPublishedAt(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? '게시일 미확인' : new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium' }).format(date); }
export function stripUnsafeMarkup(value: string): string { return value.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim(); }
