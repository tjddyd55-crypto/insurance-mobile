import { ApiError, apiRequest } from '../../api/client';
import type { NewsChannel, NewsletterBoard, NewsletterDetail, NewsletterFeed } from './types';
function auth(token: string | null): string { if (!token?.trim()) throw new ApiError('로그인이 필요합니다.', 401); return token.trim(); }
export async function getVisibleNewsletterBoards(token: string | null) { return apiRequest<NewsletterBoard[]>('/api/insurer-news/boards', { token: auth(token) }); }
export async function getNewsletterFeed(token: string | null, gaCode: string, channel: NewsChannel) { const q = new URLSearchParams({ gaCode: gaCode.trim(), limit: '500', channel }); return apiRequest<NewsletterFeed>(`/api/insurer-news/feed?${q}`, { token: auth(token) }); }
export async function getNewsletter(token: string | null, gaCode: string, channel: NewsChannel, id: string) { const q = new URLSearchParams({ gaCode: gaCode.trim(), channel }); return apiRequest<NewsletterDetail>(`/api/insurer-news/feed/${encodeURIComponent(id)}?${q}`, { token: auth(token) }); }
