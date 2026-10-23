// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

describe('customer detail value text selection SSOT', () => {
  it('DetailValueText enables native selectable on detail values', () => {
    const source = readSource('CollapsibleDetailSection.tsx');
    expect(source).toMatch(/export function DetailValueText/);
    expect(source).toMatch(/selectable/);
    expect(source).toMatch(/export function DetailRow/);
    expect(source).not.toMatch(/DetailRow[\s\S]*accessible[\s\S]*accessibilityLabel=\{`\$\{label\}, \$\{value\}`\}/);
  });

  it('special basic-info rows use DetailValueText for displayed values', () => {
    for (const file of [
      'CustomerNameDetailRow.tsx',
      'CustomerSsnDetailRow.tsx',
      'CustomerNextAgeDateDetailRow.tsx',
    ]) {
      const source = readSource(file);
      expect(source).toMatch(/DetailValueText/);
      expect(source).not.toMatch(/accessible\s*\n\s*accessibilityLabel=/);
    }
  });

  it('custom inline fields keep edit on label only so values stay selectable', () => {
    const source = readSource('detail-sections/CustomerBasicInlineCustomFields.tsx');
    expect(source).toMatch(/DetailValueText/);
    expect(source).toMatch(/labelPress/);
    expect(source).toMatch(/style=\{styles\.labelPress\}[\s\S]*onPress=\{\(\) => openEdit/);
  });

  it('SSN row renders displayValue only without clipboard side effects', () => {
    const source = readSource('CustomerSsnDetailRow.tsx');
    expect(source).not.toMatch(/clipboard|Clipboard|setStringAsync/i);
    expect(source).toMatch(/\{displayValue\}/);
  });
});
