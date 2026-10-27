import type { CoverageScenario } from './types';

/**
 * '+ 새 시뮬레이션 만들기' 미저장 초안(메모리 전용). 열기만으로는 저장소에 쓰지 않고,
 * 편집기에서 첫 '저장' 시 같은 id로 1건 생성된다. 취소/뒤로가기 시 폐기.
 */
const drafts = new Map<string, CoverageScenario>();

export function putCoverageDraft(scenario: CoverageScenario): CoverageScenario {
  drafts.set(scenario.id, scenario);
  return scenario;
}

export function getCoverageDraft(id: string): CoverageScenario | null {
  return drafts.get(id) ?? null;
}

export function updateCoverageDraft(scenario: CoverageScenario): void {
  if (drafts.has(scenario.id)) drafts.set(scenario.id, scenario);
}

export function discardCoverageDraft(id: string): void {
  drafts.delete(id);
}
