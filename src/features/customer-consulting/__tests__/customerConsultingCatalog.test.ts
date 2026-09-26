// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
import { findCustomerConsultingFeature } from '../customerConsultingCatalog';

const fs = require('fs');
const path = require('path');

describe('customer consulting reachability', () => {
  it('keeps coverage analysis unreachable because no screen exists', () => {
    const feature = findCustomerConsultingFeature('coverage-analysis');
    expect(feature.label).toBe('보장 분석');
    expect(feature.webImplemented).toBe(false);
    expect(feature.legacyWebPath).toBe('#');
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

  it('does not put the session token in a URL', () => {
    const files = [
      '../webCrmSession.ts',
      '../consultingWebNavigation.ts',
      '../ConsultingWebView.tsx',
      '../CustomerConsultingWebScreen.tsx',
      '../../../../app/(app)/customer-consulting/coverage-analysis.tsx',
    ];
    for (const file of files) {
      const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
      expect(source).not.toMatch(/[?&](token|access_token|accessToken)=/);
      expect(source).not.toMatch(/@react-navigation\//);
    }
  });
});
