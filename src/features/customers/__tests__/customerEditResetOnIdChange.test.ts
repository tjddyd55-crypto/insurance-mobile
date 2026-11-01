/* eslint-disable @typescript-eslint/no-require-imports */
const { readFileSync } = require('fs') as { readFileSync(p: string, e: string): string };
const { join } = require('path') as { join(...p: string[]): string };
declare const __dirname: string;

describe('고객 수정 화면은 customerId 가 바뀌면 새로 초기화', () => {
  it('edit route 는 customerId 를 key 로 넘겨 고객마다 새로 마운트', () => {
    const src = readFileSync(join(__dirname, '../../../../app/(app)/customers/[customerId]/edit.tsx'), 'utf8');
    expect(src).toMatch(/<CustomerFormScreen key=\{String\(customerId\)\} mode="edit-basic"/);
  });
  it('같은 인스턴스에서 customerId 변경 시 form·initialized·refs·scroll 초기화', () => {
    const src = readFileSync(join(__dirname, '../CustomerFormScreen.tsx'), 'utf8');
    const block = src.slice(src.indexOf('hydratedCustomerIdRef = useRef'), src.indexOf('const customerQuery = useQuery'));
    expect(block).toMatch(/setForm\(cloneCustomerFormState\(EMPTY_CUSTOMER_FORM\)\)/);
    expect(block).toMatch(/setInitialized\(false\)/);
    expect(block).toMatch(/originalFormRef\.current = null/);
    expect(block).toMatch(/originalSnapshotRef\.current = null/);
    expect(block).toMatch(/scrollTo\(\{ y: 0, animated: false \}\)/);
    expect(block).toMatch(/\[customerId, mode\]/);
  });
  it('다른 고객 데이터로는 채우지 않는다', () => {
    const src = readFileSync(join(__dirname, '../CustomerFormScreen.tsx'), 'utf8');
    expect(src).toMatch(/if \(customerQuery\.data\.id !== customerId\) return;/);
  });
});
