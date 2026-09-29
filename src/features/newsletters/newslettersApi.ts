import { ApiError, apiRequest } from '../../api/client';
import type {
  NewsChannel,
  NewsletterBoard,
  NewsletterDetail,
  NewsletterFeed,
  NewsletterItem,
} from './types';

function auth(token: string | null): string {
  if (!token?.trim()) throw new ApiError('로그인이 필요합니다.', 401);
  return token.trim();
}

export async function getVisibleNewsletterBoards(
  token: string | null,
): Promise<NewsletterBoard[]> {
  return apiRequest<NewsletterBoard[]>('/api/insurer-news/boards', {
    token: auth(token),
  });
}

export async function getNewsletterFeed(
  token: string | null,
  gaCode: string,
  channel: NewsChannel,
): Promise<NewsletterFeed> {
  const q = new URLSearchParams({
    gaCode: gaCode.trim(),
    limit: '500',
    channel,
  });
  return apiRequest<NewsletterFeed>(`/api/insurer-news/feed?${q}`, {
    token: auth(token),
  });
}

export async function getNewsletter(
  token: string | null,
  gaCode: string,
  channel: NewsChannel,
  id: string,
): Promise<NewsletterDetail> {
  const q = new URLSearchParams({ gaCode: gaCode.trim(), channel });
  return apiRequest<NewsletterDetail>(
    `/api/insurer-news/feed/${encodeURIComponent(id)}?${q}`,
    { token: auth(token) },
  );
}

export type BoardNewsletterFeed = {
  board: NewsletterBoard;
  newsletters: NewsletterItem[];
};

export async function getBoardNewsletterFeed(
  token: string | null,
  boardSlug: string,
): Promise<BoardNewsletterFeed> {
  return apiRequest<BoardNewsletterFeed>(
    `/api/insurer-news/boards/${encodeURIComponent(boardSlug.trim())}/newsletters?limit=500`,
    { token: auth(token) },
  );
}

export async function getBoardNewsletter(
  token: string | null,
  boardSlug: string,
  id: string,
): Promise<NewsletterDetail> {
  return apiRequest<NewsletterDetail>(
    `/api/insurer-news/boards/${encodeURIComponent(boardSlug.trim())}/newsletters/${encodeURIComponent(id)}`,
    { token: auth(token) },
  );
}
