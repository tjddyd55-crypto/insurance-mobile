// @ts-nocheck
import fs from 'fs';
import path from 'path';

import { resolveKeyboardLift } from '../modalKeyboard';
import { customerQueryKeys } from '../../features/customers/queryKeys';

const ROOT = path.join(__dirname, '..', '..', '..');
const INPUT_RE = /<(TextInput|TextField|SearchField)\b/;
// Plain RN <Modal> files allowed to contain inputs (own keyboard handling, reviewed).
const ALLOW = new Map([
  ['src/design-system/components/ModalShell.tsx', 'shared shell'],
  ['src/design-system/components/KeyboardAwareModal.tsx', 'shared wrapper'],
]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (name === 'node_modules' || name === '__tests__') continue;
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

describe('plain RN Modal keyboard guard (P1-5)', () => {
  const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'app'))];
  it('a file rendering a plain <Modal> with text inputs must use ModalShell/KeyboardAwareModal instead', () => {
    const offenders = files
      .map((f) => [path.relative(ROOT, f).split(path.sep).join('/'), fs.readFileSync(f, 'utf8')])
      .filter(([rel, src]) => !ALLOW.has(rel) && /<Modal\b/.test(src) && INPUT_RE.test(src))
      .map(([rel]) => rel);
    expect(offenders).toEqual([]);
  });
  it('migrated modals (M13/M14/M15/M16/M20/M21/M37) use KeyboardAwareModal', () => {
    for (const rel of [
      'src/features/customer-news/CustomerNewsScreen.tsx',
      'src/features/team/TeamPostFormModal.tsx',
      'src/features/premium-payments/PremiumPaymentsScreen.tsx',
      'src/features/application-documents/ApplicationDocumentsScreen.tsx',
      'src/features/coverage-simulator/CoverageShareDialog.tsx',
    ]) {
      expect(fs.readFileSync(path.join(ROOT, rel), 'utf8')).toMatch(/<KeyboardAwareModal\b/);
    }
  });
  it('KeyboardAwareModal: keyboard-first Back, top inset for fullscreen, shared lift', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/design-system/components/KeyboardAwareModal.tsx'), 'utf8');
    expect(src).toMatch(/if \(consumeBackForKeyboard\(\)\) return;\s*onRequestClose\(\);/);
    expect(src).toMatch(/!isDialog && \{ paddingTop: insets\.top \}/);
    expect(src).toMatch(/resolveKeyboardLift\(/);
    expect(src).toMatch(/<SafeAreaProvider>/);
  });
});

describe('resolveKeyboardLift', () => {
  it('lifts by uncovered overlap only when open', () => {
    expect(resolveKeyboardLift(false, 900, 0)).toBe(0);
    expect(resolveKeyboardLift(true, 900, 0)).toBe(900);
    expect(resolveKeyboardLift(true, 900, 300)).toBe(600);
    expect(resolveKeyboardLift(true, 300, 900)).toBe(0);
  });
});

describe('customer delete refreshes list cache', () => {
  it('list keys share the invalidated prefix', () => {
    const prefix = [...customerQueryKeys.all, 'list'];
    expect(customerQueryKeys.list({ search: 'x' }).slice(0, 2)).toEqual(prefix);
    const src = fs.readFileSync(path.join(ROOT, 'src/features/customers/CustomerDetailScreen.tsx'), 'utf8');
    expect(src).toMatch(/invalidateQueries\(\{ queryKey: \[\.\.\.customerQueryKeys\.all, "list"\] \}\)/);
  });
});

describe('KeyboardAwareModal footer: primary actions stay above the keyboard', () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, '../../..', p), 'utf8');
  it('wrapper renders footer outside the scroll content, with keyboard-aware bottom padding', () => {
    const src = read('src/design-system/components/KeyboardAwareModal.tsx');
    expect(src).toMatch(/footer\?: ReactNode/);
    expect(src).toMatch(/keyboard-aware-modal-footer/);
    expect(src).toMatch(/keyboardOpen \? 0 : bottomSafeInset/);
  });
  it.each([
    ['src/features/customer-news/CustomerNewsScreen.tsx', ['게시하기', '고객 앱 미리보기', '댓글 등록']],
    ['src/features/team/TeamPostFormModal.tsx', ["'등록'"]],
    ['src/features/application-documents/ApplicationDocumentsScreen.tsx', ['PDF 발급 및 공유']],
  ])('%s puts its actions in footer=, not inside ScrollView', (file, labels) => {
    const src = read(file);
    expect(src).toMatch(/footer=\{/);
    expect(src).not.toMatch(/modalBottomPadding/);
    for (const scroll of src.split('<ScrollView').slice(1).map((s) => s.split('</ScrollView>')[0])) {
      for (const label of labels) expect(scroll).not.toContain(label);
    }
  });
});

describe('/storage new folder: keyboard reveal + bounded create', () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, '../../..', p), 'utf8');
  it('StorageScreen uses the shared keyboard reveal hook', () => {
    const src = read('src/features/storage/StorageScreen.tsx');
    expect(src).toMatch(/useKeyboardRevealScroll\(scrollRef\)/);
    expect(src).toMatch(/keyboard\.keyboardInset/);
    expect(src).not.toMatch(/await qc\.invalidateQueries\(\{ queryKey: \[\.\.\.ROOT, "folders"\]/);
  });
  it('createStorageFolder has its own timeout and local validation', () => {
    const src = read('src/features/storage/storageApi.ts');
    expect(src).toMatch(/timeoutMs: STORAGE_FOLDER_CREATE_TIMEOUT_MS/);
    expect(src).toMatch(/validateStorageFolderName/);
  });
});
