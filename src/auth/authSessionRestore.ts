import { ApiError } from '../api/client';

/**
 * Cold-start session restore: only explicit auth rejection clears SecureStore.
 * Transient network/5xx errors keep the cached session for offline resilience.
 */
export function shouldClearStoredSessionOnRestoreError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}
