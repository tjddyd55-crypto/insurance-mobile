import type { EducationSchedule } from '../educationScheduleApi';
import { buildEducationPrintHtml } from '../educationSchedulePrint';

const schedule: EducationSchedule = {
  id: 'one', date: '2026-12-25', title: '교육 <script>alert(1)</script> & 제목', instructor: '김 "강사" O\'Neil',
  publicScope: 'BRANCH', scopeId: 1, canEdit: false, canDelete: false,
};

test('prints the current month in a seven-column A4 landscape calendar with escaped entries', () => {
  const html = buildEducationPrintHtml({
    month: '2026-12',
    schedules: [schedule, { ...schedule, id: 'two', title: '두 번째 일정', instructor: '' }],
    holidays: [{ date: '2026-12-25', name: '성탄절' }],
  });

  expect(html).toContain('@page { size: A4 landscape;');
  expect(html).toContain('<span>2026 December</span><b>12</b>');
  expect(html.match(/<th /g)).toHaveLength(7);
  expect(html.match(/<td[>]/g)).toHaveLength(35);
  expect(html).toContain('class="sunday">SUN</th>');
  expect(html).toContain('class="saturday">SAT</th>');
  expect(html).toContain('<strong class="day sunday">25</strong>');
  expect(html).toContain('<div class="entry sunday">성탄절</div>');
  expect(html).toContain('<div>교육 &lt;script&gt;alert(1)&lt;/script&gt; &amp; 제목</div><div>김 &quot;강사&quot; O&#39;Neil</div>');
  expect(html).toContain('<div class="entry"><div>두 번째 일정</div></div>');
  expect(html).not.toContain('<script>');
});

test('uses six weeks only when needed', () => {
  const html = buildEducationPrintHtml({ month: '2026-08', schedules: [], holidays: [] }, true);
  expect(html.match(/<td[>]/g)).toHaveLength(42);
});
