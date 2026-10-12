import { ApiError } from '../../api/client';

export function teamContentUserMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.message === 'DB_ERROR' || error.code === 'DB_ERROR') {
      return fallback;
    }
    if (error.message.trim()) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    if (error.message === 'DB_ERROR') {
      return fallback;
    }
    return error.message;
  }
  return fallback;
}
