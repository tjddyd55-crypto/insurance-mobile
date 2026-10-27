/** 정적 가드 (QA d9 P1-2): 상세 Modal과 삭제 확인 Modal을 겹쳐 띄우지 않는다(Android Dialog z-order 경쟁 제거). */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs') as { readFileSync(p: string, e: string): string };
const path = require('path') as { join(...p: string[]): string };
declare const __dirname: string;
const src = fs.readFileSync(path.join(__dirname, '..', 'ScheduleScreen.tsx'), 'utf8');
const compact = src.replace(/\s+/g, ' ');

describe('schedule delete confirm does not stack over detail', () => {
  it('detail closes before confirm opens', () => {
    expect(compact).toContain('onDelete={(event) => { setDetail(null); setDeleting(event); }}');
  });
  it('취소 reopens detail and resets the delete mutation', () => {
    expect(compact).toContain('onCancel={() => { const back = deleting; setDeleting(null); remove.reset(); if (back) setDetail(back); }}');
  });
  it('widget flow stays open while confirm is shown (deleting counted as an open modal)', () => {
    expect(compact).toMatch(/scheduleModalsOpen\(\{[^}]*deleting: deleting !== null/);
  });
});
