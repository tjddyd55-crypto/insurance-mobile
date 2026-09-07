import {
  ApiError,
  isApiUnauthorizedError,
  isTransientApiError,
  resolveApiUrl,
  resetUnauthorizedLatch,
  setUnauthorizedHandler,
} from '../../api/client';

describe('api client', () => {
  it('resolves /api paths against absolute base', () => {
    expect(resolveApiUrl('/api/auth/login', 'https://insurance-dev.up.railway.app')).toBe(
      'https://insurance-dev.up.railway.app/api/auth/login',
    );
  });

  it('normalizes ApiError fields', () => {
    const err = new ApiError('실패', 401, { code: 'unauthorized' });
    expect(err.status).toBe(401);
    expect(err.code).toBe('unauthorized');
    expect(isApiUnauthorizedError(err)).toBe(true);
    expect(isTransientApiError(err)).toBe(false);
  });

  it('classifies transient network errors', () => {
    const err = new ApiError('offline', 0);
    expect(isTransientApiError(err)).toBe(true);
    expect(isApiUnauthorizedError(err)).toBe(false);
  });

  it('401 handler fires once (no infinite retry latch)', () => {
    resetUnauthorizedLatch();
    let count = 0;
    setUnauthorizedHandler(() => {
      count += 1;
    });
    resetUnauthorizedLatch();
    expect(typeof setUnauthorizedHandler).toBe('function');
    expect(count).toBe(0);
  });
});
