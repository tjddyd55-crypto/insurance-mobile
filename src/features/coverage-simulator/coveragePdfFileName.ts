import type { CoverageScenario } from './types';

const INVALID_FILE_NAME_CHARS = /[\\/:*?"<>|\u0000-\u001F\u007F]/g;
const MAX_FILE_NAME_PART_LENGTH = 40;
const SIMULATION_NAME_FALLBACK = '보장시뮬레이션';

function sanitizeFilePart(value: string): string {
  const collapsed = value.replace(INVALID_FILE_NAME_CHARS, '').replace(/\s+/g, ' ').trim();
  return Array.from(collapsed).slice(0, MAX_FILE_NAME_PART_LENGTH).join('');
}

function customerFilePart(scenario: CoverageScenario): string {
  const raw = scenario.customerNameSnapshot?.trim() || scenario.customerName?.trim() || '';
  return sanitizeFilePart(raw);
}

function simulationFilePart(scenario: CoverageScenario): string {
  return sanitizeFilePart(scenario.title ?? '');
}

export function buildCoveragePdfFileName(scenario: CoverageScenario): string {
  const customer = customerFilePart(scenario);
  const simulation = simulationFilePart(scenario) || (customer ? '' : SIMULATION_NAME_FALLBACK);
  const parts = [customer, simulation].filter((part) => part.length > 0);
  return `${parts.join('_')}.pdf`;
}
