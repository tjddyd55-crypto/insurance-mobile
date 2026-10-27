/** 정적 가드: RN Android는 accessibilityLabel 없이 busy=true→false 전환 시 contentDescription '처리 중'을 지우지 않는다.
 *  Button은 항상 accessibilityLabel={label}을 넘겨 busy 해제 후 content-desc가 label로 재설정되게 한다. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs') as { readFileSync(p: string, e: string): string };
const path = require('path') as { join(...p: string[]): string };
declare const __dirname: string;
const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'Button.tsx'), 'utf8');

describe('Button busy a11y', () => {
  it('always sets accessibilityLabel from label, before rest spread', () => {
    const pressable = src.slice(src.indexOf('<Pressable'), src.indexOf('{...rest}'));
    expect(pressable).toContain('accessibilityLabel={label}');
    expect(pressable).toContain('busy: loading');
  });
});
