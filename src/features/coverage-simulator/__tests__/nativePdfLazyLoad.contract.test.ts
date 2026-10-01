// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

describe('native pdf lazy load contract', () => {
  it('does not evaluate expo-print or expo-sharing from the pdf module scope', () => {
    const pdf = fs.readFileSync(path.join(__dirname, '../nativeCoveragePdf.ts'), 'utf8');
    const modules = fs.readFileSync(path.join(__dirname, '../nativePdfModules.ts'), 'utf8');
    const lookup = fs.readFileSync(path.join(__dirname, '../nativeModuleLookup.ts'), 'utf8');
    const screen = fs.readFileSync(path.join(__dirname, '../CoveragePdfPreviewScreen.tsx'), 'utf8');

    expect(pdf).not.toMatch(/from 'expo-print'/);
    expect(pdf).not.toMatch(/from 'expo-sharing'/);
    expect(pdf).not.toMatch(/아직 만들지 않습니다/);
    expect(screen).not.toMatch(/아직 만들지 않습니다/);
    expect(lookup).toContain('requireOptionalNativeModule(moduleName)');
    expect(modules).toContain("require('expo-print')");
    expect(modules).toContain("require('expo-sharing')");
    expect(modules).toContain('PDF 저장은 앱을 최신 버전으로 업데이트한 후 사용할 수 있습니다.');
  });
});
