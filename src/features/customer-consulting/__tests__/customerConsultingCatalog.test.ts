// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
import { CUSTOMER_CONSULTING_FEATURES, findCustomerConsultingFeature } from '../customerConsultingCatalog';

const fs = require('fs');
const path = require('path');

describe('customer consulting reachability', () => {
  it('exposes exactly the binder and the simulator', () => {
    expect(CUSTOMER_CONSULTING_FEATURES.map((item) => item.label)).toEqual([
      '내 바인더',
      '보장 시뮬레이션',
    ]);
    expect(CUSTOMER_CONSULTING_FEATURES.map((item) => item.id)).toEqual([
      'personal-binder',
      'coverage-simulation',
    ]);
  });

  it('routes the binder through the DEV web handoff', () => {
    const feature = findCustomerConsultingFeature('personal-binder');
    expect(feature.legacyWebPath).toBe('/personal-binders');
    expect(feature.webImplemented).toBe(true);
    expect(feature.nativeImplemented).toBe(false);
    const route = fs.readFileSync(
      path.join(__dirname, '../../../../app/(app)/customer-consulting/personal-binders.tsx'),
      'utf8',
    );
    expect(route).toContain('CustomerConsultingWebScreen');
    expect(route).toContain('personal-binder');
    expect(route).not.toMatch(/[?&]token=|access_token/);
  });

  it('routes coverage simulation through the DEV web handoff', () => {
    const feature = findCustomerConsultingFeature('coverage-simulation');
    expect(feature.legacyWebPath).toBe('/coverage-simulator');
    expect(feature.webImplemented).toBe(true);
    const route = fs.readFileSync(
      path.join(__dirname, '../../../../app/(app)/customer-consulting/coverage-simulation.tsx'),
      'utf8',
    );
    expect(route).toContain('CustomerConsultingWebScreen');
    expect(route).not.toMatch(/[?&]token=|access_token/);
  });

  it('does not keep a coverage analysis route', () => {
    const removed = path.join(__dirname, '../../../../app/(app)/customer-consulting/coverage-analysis.tsx');
    expect(fs.existsSync(removed)).toBe(false);
  });

  it('does not put the session token in a URL or import react-navigation', () => {
    const files = [
      '../webCrmSession.ts',
      '../consultingWebNavigation.ts',
      '../consultingWebPage.ts',
      '../consultingDownload.ts',
      '../ConsultingWebView.tsx',
      '../useConsultingDrawerSwipeLock.ts',
      '../CustomerConsultingWebScreen.tsx',
      '../../../../app/(app)/customer-consulting/personal-binders.tsx',
    ];
    for (const file of files) {
      const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
      expect(source).not.toMatch(/[?&](token|access_token|accessToken)=/);
      expect(source).not.toMatch(/@react-navigation\//);
    }
  });
});
