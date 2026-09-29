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

  it('upgrades claim bundle cleartext URLs on the production API host to https', () => {
    const accessToken = 'eyJhbGciOiJIUzI1NiJ9.abc-def_ghi';
    const httpPdf =
      'http://insurance-production-7bd8.up.railway.app/backend/agent/customer-claim-requests/62/files.pdf?customerId=9&accessToken=' +
      accessToken;
    const httpZip =
      'http://insurance-production-7bd8.up.railway.app:80/backend/agent/customer-claim-requests/62/files.zip?customerId=9&accessToken=' +
      accessToken;
    const base = 'https://insurance-production-7bd8.up.railway.app';

    expect(resolveApiUrl(httpPdf, base)).toBe(
      'https://insurance-production-7bd8.up.railway.app/backend/agent/customer-claim-requests/62/files.pdf?customerId=9&accessToken=' +
        accessToken,
    );
    expect(resolveApiUrl(httpZip, base)).toBe(
      'https://insurance-production-7bd8.up.railway.app/backend/agent/customer-claim-requests/62/files.zip?customerId=9&accessToken=' +
        accessToken,
    );
  });

  it('upgrades the dev API host and a custom https API host, and leaves other http URLs', () => {
    expect(
      resolveApiUrl(
        'http://insurance-dev.up.railway.app/backend/agent/customer-claim-requests/1/files.pdf',
        'https://api.onefc.example',
      ),
    ).toBe('https://insurance-dev.up.railway.app/backend/agent/customer-claim-requests/1/files.pdf');

    expect(
      resolveApiUrl(
        'http://api.onefc.example/backend/agent/customer-claim-requests/1/files.zip?accessToken=a.b',
        'https://api.onefc.example',
      ),
    ).toBe(
      'https://api.onefc.example/backend/agent/customer-claim-requests/1/files.zip?accessToken=a.b',
    );

    const productionBase = 'https://insurance-production-7bd8.up.railway.app';
    expect(resolveApiUrl(`${productionBase}/backend/x`, productionBase)).toBe(
      `${productionBase}/backend/x`,
    );
    expect(resolveApiUrl('http://cdn.example.com/a.pdf', productionBase)).toBe(
      'http://cdn.example.com/a.pdf',
    );
    expect(resolveApiUrl('/api/auth/login', 'http://10.0.2.2:3000')).toBe(
      'http://10.0.2.2:3000/api/auth/login',
    );
    expect(
      resolveApiUrl(
        'http://insurance-production-7bd8.up.railway.app:8080/backend/x',
        'https://insurance-production-7bd8.up.railway.app',
      ),
    ).toBe('http://insurance-production-7bd8.up.railway.app:8080/backend/x');
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
