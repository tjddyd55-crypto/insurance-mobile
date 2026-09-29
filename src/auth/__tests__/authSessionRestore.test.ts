import { ApiError } from '../../api/client';
import { shouldClearStoredSessionOnRestoreError } from '../authSessionRestore';

describe('shouldClearStoredSessionOnRestoreError', () => {
  it('clears session on 401/403', () => {
    expect(shouldClearStoredSessionOnRestoreError(new ApiError('unauthorized', 401))).toBe(true);
    expect(shouldClearStoredSessionOnRestoreError(new ApiError('forbidden', 403))).toBe(true);
  });

  it('keeps session on network and server errors', () => {
    expect(shouldClearStoredSessionOnRestoreError(new ApiError('timeout', 0))).toBe(false);
    expect(shouldClearStoredSessionOnRestoreError(new ApiError('server', 500))).toBe(false);
    expect(shouldClearStoredSessionOnRestoreError(new Error('network'))).toBe(false);
  });
});
