// @ts-nocheck
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('coverage simulator modal keyboard UX', () => {
  it('scenario add modal keeps cancel/create footer and disables body scroll', () => {
    const source = fs.readFileSync(
      path.join(root, 'CoverageScenarioSelectScreen.tsx'),
      'utf8',
    );
    expect(source).toMatch(/scroll=\{false\}/);
    expect(source).toMatch(/label="취소"/);
    expect(source).toMatch(/label="만들기"/);
    expect(source).toMatch(/Keyboard\.dismiss\(\)/);
    expect(source).toMatch(/closeAddScenario/);
  });

  it('customer picker uses fixed search and flex list inside dialog shell', () => {
    const source = fs.readFileSync(path.join(root, 'CustomerPickerDialog.tsx'), 'utf8');
    expect(source).toMatch(/scroll=\{false\}/);
    expect(source).toMatch(/dialogFillBody/);
    expect(source).toMatch(/dialogMaxHeightPx/);
    expect(source).not.toMatch(/FlatList[\s\S]*ScrollView/);
    expect(source).toMatch(/searchBlock/);
    expect(source).toMatch(/flex:\s*1,\s*\n\s*minHeight:\s*0/);
  });

  it('modal shell lifts dialog above keyboard without flex-end jump', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../../design-system/components/ModalShell.tsx'),
      'utf8',
    );
    expect(source).toMatch(/dialogFillBody/);
    expect(source).toMatch(/dialogMaxHeightPx/);
    expect(source).not.toMatch(/dialogOverlayKeyboardOpen/);
    expect(source).toMatch(/paddingBottom: Math\.max\(keyboardInset/);
  });
});
