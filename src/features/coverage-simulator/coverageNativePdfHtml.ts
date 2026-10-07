import {
  calculateScenarioPeriodTotals,
  calculateScenarioTotals,
  categoryLabel,
  formatCoverageWrittenDate,
  formatCoverageAmountLabel,
  formatTotalAmountLabel,
  periodSubtotalLabelFromMarker,
  sortItems,
} from './coverageAnalysis';
import { getCoverageCategoryTheme } from './coverageCategoryTheme';
import { simulatorTheme as theme } from './simulatorTheme';
import { diseaseTypeTitle } from './templates';
import type { CoverageScenario, CoverageScenarioItem, ScenarioItem } from './types';

const DISCLAIMER = [
  '본 자료는 상담 시 입력된 보장내용을 기준으로 작성된 비교자료입니다.',
  '실제 보험금 지급 여부 및 금액은 약관, 가입조건 및 사고내용에 따라 달라질 수 있습니다.',
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function badgeStyle(category: CoverageScenarioItem['category']): string {
  const badge = getCoverageCategoryTheme(category);
  return `background:${badge.bg};color:${badge.fg};`;
}

const PDF_NAME_SIDE_INSET_PX = 52;

function renderCoverageRow(item: CoverageScenarioItem): string {
  const badge = categoryLabel(item.category);
  return `
    <tbody class="coverage-item">
    <tr class="coverage-name-row">
      <td colspan="2">
        <div class="coverage-head">
          <span class="badge" style="${badgeStyle(item.category)}">${escapeHtml(badge)}</span>
          <div class="coverage-name">${escapeHtml(item.label)}</div>
        </div>
      </td>
    </tr>
    <tr class="row coverage-amount-row">
      <td class="amount">${escapeHtml(formatCoverageAmountLabel(item.currentAmount))}</td>
      <td class="amount proposed">${escapeHtml(formatCoverageAmountLabel(item.proposedAmount))}</td>
    </tr>
    </tbody>`;
}

function renderPeriodSubtotal(
  markerLabel: string,
  current: number,
  proposed: number,
): string {
  const side = (amount: number) => (amount <= 0 ? '없음' : escapeHtml(formatTotalAmountLabel(amount)));
  return `
    <tr class="period">
      <td colspan="2">
        <div class="period-label">${escapeHtml(periodSubtotalLabelFromMarker(markerLabel))}</div>
        <div class="period-values">
          <span>${side(current)}</span>
          <span class="proposed">${side(proposed)}</span>
        </div>
      </td>
    </tr>`;
}

function renderMarker(label: string): string {
  return `
    <tr class="marker">
      <td colspan="2">${escapeHtml(label)} ↓</td>
    </tr>`;
}

function renderItems(items: ScenarioItem[]): string {
  const periods = calculateScenarioPeriodTotals(items);
  const sorted = sortItems(items);
  const chunks: string[] = [];
  for (const item of sorted) {
    if (item.type === 'time-marker') {
      const period = periods.find((entry) => entry.endMarkerId === item.id);
      if (period) {
        chunks.push(renderPeriodSubtotal(item.label, period.currentTotal, period.proposedTotal));
      }
      chunks.push(renderMarker(item.label));
      continue;
    }
    chunks.push(renderCoverageRow(item));
  }
  return chunks.join('');
}

export function buildCoverageNativePdfHtml(scenario: CoverageScenario): string {
  const customerName = scenario.customerNameSnapshot ?? scenario.customerName ?? '';
  const date = formatCoverageWrittenDate(scenario);
  const totals = calculateScenarioTotals(scenario);
  const subtitle = `${diseaseTypeTitle(scenario.diseaseType)} — ${scenario.title}`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: ${theme.text}; margin: 24px; font-size: 13px; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    .subtitle { color: ${theme.muted}; margin: 0 0 8px; }
    .meta { color: ${theme.muted}; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: center; font-size: 12px; color: ${theme.headerAxis}; padding: 8px 4px; border-bottom: 1px solid ${theme.divider}; }
    th.proposed { color: ${theme.primary}; }
    td { vertical-align: middle; padding: 8px 4px; }
    tbody.coverage-item .coverage-name-row td { padding-bottom: 4px; border-bottom: none; }
    tbody.coverage-item .coverage-amount-row td {
      padding-bottom: 10px;
      border-bottom: 1px solid ${theme.line};
    }
    tbody.coverage-item + tbody.coverage-item .coverage-name-row td { padding-top: 6px; }
    th, td.amount { width: 50%; }
    .coverage-head { position: relative; min-height: 24px; }
    .coverage-head .badge { position: absolute; left: 0; top: 0; display: inline-block; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; }
    .coverage-name { display: block; margin: 0 ${PDF_NAME_SIDE_INSET_PX}px; text-align: center; font-weight: 700; font-size: 14px; line-height: 1.4; overflow-wrap: anywhere; }
    td.amount { text-align: center; font-weight: 700; }
    td.amount.proposed { color: ${theme.primary}; }
    tr.period td {
      background: ${theme.summaryBg};
      border-top: 1px solid ${theme.summaryLine};
      border-bottom: 1px solid ${theme.divider};
      padding-top: 10px;
      padding-bottom: 10px;
    }
    .period-label { font-weight: 700; margin-bottom: 4px; }
    .period-values { display: flex; font-weight: 700; }
    .period-values > span { flex: 1; text-align: center; }
    .period-values .proposed { color: ${theme.primary}; }
    tr.marker td {
      text-align: center;
      font-weight: 900;
      color: ${theme.marker};
      padding: 14px 4px;
      border-top: 1px solid ${theme.summaryLine};
      border-bottom: none;
    }
    .totals { margin-top: 16px; display: flex; font-weight: 800; font-size: 14px; }
    .totals > span { flex: 1; text-align: center; }
    .totals .proposed { color: ${theme.primary}; }
    .disclaimer { margin-top: 20px; color: ${theme.muted}; font-size: 12px; line-height: 1.5; }
    .service { margin-top: 8px; font-weight: 700; color: ${theme.text}; }
  </style>
</head>
<body>
  <h1>보장 시뮬레이션</h1>
  <p class="subtitle">${escapeHtml(subtitle)}</p>
  <p class="meta">${customerName ? `고객: ${escapeHtml(customerName)} · ` : ''}작성일 ${escapeHtml(date)}</p>
  <table>
    <thead>
      <tr>
        <th>기존 보장</th>
        <th class="proposed">제안 보장</th>
      </tr>
    </thead>
    <tbody>
      ${renderItems(scenario.items)}
    </tbody>
  </table>
  <div class="totals">
    <span>기존 총보장 ${escapeHtml(formatTotalAmountLabel(totals.currentTotal))}</span>
    <span class="proposed">제안 총보장 ${escapeHtml(formatTotalAmountLabel(totals.proposedTotal))}</span>
  </div>
  <div class="disclaimer">
    ${DISCLAIMER.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
    <p class="service">ONE FC 보장 시뮬레이션 · 상담 참고용</p>
  </div>
</body>
</html>`;
}
