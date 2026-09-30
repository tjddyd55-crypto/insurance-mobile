import type { CoverageScenario } from './types';
import { isScenarioRecord } from './scenarioEdits';

export const COVERAGE_SIMULATION_HOME = '/customer-consulting/coverage-simulation';

export function coverageTemplateSimulationListPath(templateId: string): string {
  return `${COVERAGE_SIMULATION_HOME}/templates/${templateId.trim()}/simulations`;
}

export function coverageScenarioEditorPath(scenarioId: string): string {
  return `${COVERAGE_SIMULATION_HOME}/scenarios/${scenarioId}`;
}

/** 보장분석/템플릿 편집 화면 뒤로가기 — Web CRM mobile과 동일 정책 */
export function resolveCoverageEditorBackPath(scenario: CoverageScenario): string {
  if (isScenarioRecord(scenario)) {
    return COVERAGE_SIMULATION_HOME;
  }
  const templateId = scenario.templateId?.trim();
  if (templateId) {
    return coverageTemplateSimulationListPath(templateId);
  }
  return `${COVERAGE_SIMULATION_HOME}/disease/${scenario.diseaseType}`;
}
