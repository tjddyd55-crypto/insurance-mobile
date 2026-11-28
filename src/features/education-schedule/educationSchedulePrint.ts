import { File } from 'expo-file-system';

import { assertValidPdfUri } from '../coverage-simulator/nativeCoveragePdf';
import {
  PDF_SAVE_REQUIRES_APP_UPDATE,
  assertPdfExportNativeModules,
  loadExpoPrint,
  loadExpoSharing,
} from '../coverage-simulator/nativePdfModules';
import type { EducationMonth } from './educationScheduleApi';
import { buildEducationCalendar, educationDayTone } from './educationScheduleModel';

const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const A4_LANDSCAPE = { width: 842, height: 595 } as const;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function buildEducationPrintHtml(data: Pick<EducationMonth, 'month' | 'schedules' | 'holidays'>, compact = false): string {
  const [year, month] = data.month.split('-');
  const monthNumber = Number(month);
  const weeks = buildEducationCalendar(data);
  const headers = weekdays.map((day, index) => `<th scope="col" class="${educationDayTone(index)}">${day}</th>`).join('');
  const rows = weeks.map((week) => {
    const cells = week.map((cell) => {
      if (!cell.inMonth) return '<td></td>';
      const entries = cell.schedules.map(({ title, instructor }) => (
        `<div class="entry"><div>${escapeHtml(title)}</div>${instructor ? `<div>${escapeHtml(instructor)}</div>` : ''}</div>`
      )).join('');
      const holiday = cell.holiday ? `<div class="entry sunday">${escapeHtml(cell.holiday)}</div>` : '';
      return `<td><strong class="day ${cell.tone}">${cell.day}</strong>${entries}${holiday}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>교육일정 ${escapeHtml(data.month)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #000; background: #fff; font: ${compact ? 9 : 11}pt/1.2 Arial, "Apple SD Gothic Neo", sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { display: flex; justify-content: flex-end; align-items: baseline; gap: 5mm;
    padding: 0 1mm 2mm; font-size: ${compact ? 16 : 18}pt; font-weight: bold; }
  header b { color: #f00; font-size: ${compact ? 32 : 40}pt; line-height: 1; }
  table { width: 100%; table-layout: fixed; border-collapse: collapse; }
  th, td { border: 1px solid #aaa; }
  th { padding: 2pt; text-align: center; }
  td { vertical-align: top; padding: 2pt; height: ${compact ? 22 : 25}mm; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  .day { display: block; }
  .entry { text-align: center; overflow-wrap: anywhere; word-wrap: break-word; }
  .entry + .entry { margin-top: 1pt; }
  .sunday { color: #d00; }
  .saturday { color: #00d; }
</style>
</head>
<body>
<header><span>${escapeHtml(year)} ${monthNames[monthNumber - 1]}</span><b>${monthNumber}</b></header>
<table>
<thead><tr>${headers}</tr></thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`;
}

export async function shareEducationSchedulePdf(data: EducationMonth): Promise<void> {
  try {
    assertPdfExportNativeModules();
  } catch (error) {
    if (error instanceof Error && error.message === PDF_SAVE_REQUIRES_APP_UPDATE) {
      throw new Error('이 앱 버전에서는 PDF를 출력할 수 없습니다. 웹에서 교육일정을 출력해 주세요.');
    }
    throw error;
  }
  const sharing = loadExpoSharing();
  if (!(await sharing.isAvailableAsync())) {
    throw new Error('이 기기에서는 PDF 공유를 사용할 수 없습니다. 웹에서 교육일정을 출력해 주세요.');
  }

  const print = loadExpoPrint();
  for (const compact of [false, true]) {
    const { uri, numberOfPages } = await print.printToFileAsync({
      html: buildEducationPrintHtml(data, compact),
      ...A4_LANDSCAPE,
    });
    if (numberOfPages === 1) {
      await assertValidPdfUri(uri);
      await sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `교육일정 ${data.month}`,
        UTI: 'com.adobe.pdf',
      });
      return;
    }

    const rejectedPdf = new File(uri);
    if (rejectedPdf.exists) rejectedPdf.delete();
    if (numberOfPages < 1) throw new Error('교육일정 PDF를 생성하지 못했습니다.');
  }
  throw new Error('일정이 많아 읽을 수 있는 크기로 A4 한 장에 출력할 수 없습니다.');
}
