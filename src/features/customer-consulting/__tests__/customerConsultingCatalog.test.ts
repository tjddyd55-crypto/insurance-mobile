// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
import {
  CUSTOMER_CONSULTING_FEATURES,
  findCustomerConsultingFeature,
} from '../customerConsultingCatalog';

const fs = require('fs');
const path = require('path');

describe('customer consulting reachability', () => {
  it('keeps coverage analysis unreachable because no screen exists', () => {
    const feature = findCustomerConsultingFeature('coverage-analysis');
    expect(feature.label).toBe('보장 분석');
    expect(feature.nativeImplemented).toBe(false);
    expect(feature.webImplemented).toBe(false);
    expect(feature.legacyWebPath).toBe('#');
  });

  it('points coverage simulation at the PC route without opening it', () => {
    const feature = findCustomerConsultingFeature('coverage-simulation');
    expect(feature.label).toBe('보장 시뮬레이션');
    expect(feature.nativeImplemented).toBe(false);
    expect(feature.webImplemented).toBe(true);
    expect(feature.legacyWebPath).toBe('/coverage-simulator');
    expect(feature.nativePath).toBe('/customer-consulting/coverage-simulation');
  });

  it('does not bridge the web CRM with a WebView or a token in the URL', () => {
    const files = [
      path.join(__dirname, '../CustomerConsultingUnavailableScreen.tsx'),
      path.join(__dirname, '../customerConsultingCatalog.ts'),
      path.join(__dirname, '../../../../app/(app)/customer-consulting/coverage-analysis.tsx'),
      path.join(__dirname, '../../../../app/(app)/customer-consulting/coverage-simulation.tsx'),
    ];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/from ['"]react-native-webview['"]|<WebView/);
      expect(source).not.toMatch(/@react-navigation\//);
      expect(source).not.toMatch(/[?&]token=|access_token|accessToken/);
    }
    expect(CUSTOMER_CONSULTING_FEATURES.every((feature) => !feature.nativeImplemented)).toBe(true);
  });
});
