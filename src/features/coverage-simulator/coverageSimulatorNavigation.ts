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

/** 고객 워크스페이스에서 진입한 편집기의 원래 위치(origin). 숫자 id만 허용. */
export function coverageEditorCustomerOrigin(raw: string | string[] | undefined): string | null {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value && /^\d+$/.test(value) ? value : null;
}

/**
 * 편집기 뒤로가기(헤더·하드웨어 공통). 고객 화면에서 왔으면 그 고객의 시뮬레이션 목록으로,
 * 아니면 기존 보장분석 목록 정책. scenario가 아직 없으면(직접 딥링크) 보장분석 홈이 안전 fallback.
 */
export function coverageEditorBackPath(
  scenario: CoverageScenario | null | undefined,
  fromCustomerId: string | string[] | undefined,
): string {
  const customerId = coverageEditorCustomerOrigin(fromCustomerId);
  if (customerId) return `/customers/${customerId}/coverage-simulations`;
  return scenario ? resolveCoverageEditorBackPath(scenario) : COVERAGE_SIMULATION_HOME;
}
