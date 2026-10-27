/** 정적 가드 (button-ssot-audit P1): 위험 확인 danger, footer 순서 [취소 | 위험], 저장/등록 primary 13곳. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs') as { readFileSync(p: string, e: string): string };
const path = require('path') as { join(...p: string[]): string };
declare const __dirname: string;
const SRC = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

function buttons(source: string): string[] {
  return Array.from(source.matchAll(/<Button\b[\s\S]*?\/>/g)).map((m) => m[0]);
}
function buttonWithLabel(source: string, label: string): string[] {
  return buttons(source).filter((b) => b.includes(label));
}

describe('P1-B schedule delete', () => {
  const src = read('features/schedule/ScheduleScreen.tsx');
  it('delete ConfirmDialog uses tone="danger" with busy', () => {
    const dialog = src.match(/<ConfirmDialog[\s\S]*?\/>/)?.[0] ?? '';
    expect(dialog).toContain('confirmLabel="삭제"');
    expect(dialog).toContain('tone="danger"');
    expect(dialog).toContain('busy={remove.isPending}');
  });
  it('수정/삭제 live in the ModalShell footer; 삭제 is danger with pending guard', () => {
    const footer = src.match(/footer=\{editable \?[\s\S]*?\) : undefined\}/)?.[0] ?? '';
    const del = buttonWithLabel(footer, 'label="삭제"')[0] ?? '';
    const edit = buttonWithLabel(footer, 'label="수정"')[0] ?? '';
    expect(del).toContain('variant="danger"');
    expect(del).toContain('loading={deleteBusy}');
    expect(del).toContain('disabled={deleteBusy}');
    expect(edit).toContain('variant="primary"');
    expect(src).toContain('deleteBusy={remove.isPending}');
  });
});

describe('P1-C account deletion footer order matches ConfirmDialog', () => {
  it('ConfirmDialog renders [cancel secondary, confirm] in that order', () => {
    const cd = read('components/ConfirmDialog.tsx');
    expect(cd.indexOf('label={cancelLabel}')).toBeLessThan(cd.indexOf('label={confirmLabel}'));
  });
  it('AccountDeletionSection footer: 취소 first, 계정 삭제 요청 (danger) second', () => {
    const src = read('features/profile/AccountDeletionSection.tsx');
    const footer = src.match(/footer=\{<Inline>[\s\S]*?<\/Inline>\}/)?.[0] ?? '';
    const bs = buttons(footer);
    expect(bs).toHaveLength(2);
    expect(bs[0]).toContain('label="취소"');
    expect(bs[0]).toContain('variant="secondary"');
    expect(bs[1]).toContain('label="계정 삭제 요청"');
    expect(bs[1]).toContain('variant="danger"');
  });
});

describe('P1-D save/confirm buttons are primary (13 places)', () => {
  const TARGETS: Array<[string, string]> = [
    ['features/customer-workspace/CustomerMemosScreen.tsx', "label={editor.note ? '수정 저장' : '메모 추가'}"],
    ['features/customer-workspace/CustomerConsultationsScreen.tsx', 'label="저장"'],
    ['features/personal-binders/BinderPageSelectionModal.tsx', 'label="넣기"'],
    ['features/personal-binders/BinderEditorScreen.tsx', 'label="저장" loading={busy} disabled={!form?.title.trim()}'],
    ['features/personal-binders/BinderListScreen.tsx', 'label="저장" loading={busy} onPress={() => void submitRename(invalidate)}'],
    ['features/personal-binders/BinderListScreen.tsx', "label={form?.mode === 'duplicate' ? '복제' : '만들기'}"],
    ['features/coverage-simulator/CoverageSimulationListScreen.tsx', 'label="저장" loading={busy} onPress={() => void submitRename()}'],
    ['features/coverage-simulator/SavedScenarioCrudPanel.tsx', 'label="저장" loading={busy} onPress={() => void submitRename()}'],
    ['features/coverage-simulator/CoverageScenarioSelectScreen.tsx', 'label="만들기"'],
    ['features/coverage-simulator/ScenarioLibraryCrudPanel.tsx', 'label="저장" loading={busy} onPress={() => void submitRename()}'],
    ['features/feature-requests/FeatureRequestsScreen.tsx', 'label="등록"'],
    ['features/customer-news/CustomerNewsScreen.tsx', "label={editing ? '수정하기' : '게시하기'}"],
    ['features/customer-news/CustomerNewsScreen.tsx', 'label="댓글 등록"'],
  ];
  it.each(TARGETS)('%s %s', (file, label) => {
    const matches = buttonWithLabel(read(file), label);
    expect(matches.length).toBeGreaterThan(0);
    for (const b of matches) expect(b).toContain('variant="primary"');
  });
});
