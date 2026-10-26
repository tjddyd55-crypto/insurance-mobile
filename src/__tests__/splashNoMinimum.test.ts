// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync } = require('fs');
const { join } = require('path');

describe('splash', () => {
  it('고정 최소 노출 시간 없이 준비되면 바로 숨긴다', () => {
    const src = readFileSync(join(__dirname, '../../app/_layout.tsx'), 'utf8');
    expect(src).not.toMatch(/MINIMUM_SPLASH_MS|splashStartedAt/);
    expect(src).toMatch(/SplashScreen\.hideAsync\(\)/);
  });
});
