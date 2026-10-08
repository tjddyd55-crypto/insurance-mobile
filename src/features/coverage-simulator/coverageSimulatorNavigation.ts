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

type CoverageEditorRouter = {
  back: () => void;
  replace: (path: string) => void;
  canGoBack?: () => boolean;
};

/**
 * 상세 편집 화면 이탈 — 스택에 이전 화면이 있으면 pop만 한다.
 * replace로 리스트를 다시 쌓으면 Back 2회(깜빡임)가 난다.
 */
export function leaveCoverageEditor(router: CoverageEditorRouter, scenario: CoverageScenario): void {
  if (router.canGoBack?.()) {
    router.back();
    return;
  }
  router.replace(resolveCoverageEditorBackPath(scenario));
}
